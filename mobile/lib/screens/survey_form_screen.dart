import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:uuid/uuid.dart';
import '../services/database_helper.dart';
import '../services/sync_service.dart';
import '../widgets/question_widget.dart';

class SurveyFormScreen extends StatefulWidget {
  final String surveyKey;
  final String surveyName;
  final Map<String, dynamic> surveyData;

  const SurveyFormScreen({
    super.key,
    required this.surveyKey,
    required this.surveyName,
    required this.surveyData,
  });

  @override
  State<SurveyFormScreen> createState() => _SurveyFormScreenState();
}

class _SurveyFormScreenState extends State<SurveyFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, dynamic> _responses = {};
  int _currentPage = 0;
  late List<Map<String, dynamic>> _pages;

  @override
  void initState() {
    super.initState();
    _pages = _parsePages();
  }

  List<Map<String, dynamic>> _parsePages() {
    final data = widget.surveyData;
    final pages = data['pages'] as List?;
    if (pages != null && pages.isNotEmpty) {
      return pages.cast<Map<String, dynamic>>();
    }
    // If no pages structure, wrap all elements in a single page
    final elements = data['elements'] as List? ?? data['questions'] as List? ?? [];
    return [
      {'name': 'page1', 'elements': elements}
    ];
  }

  List<Map<String, dynamic>> _getCurrentPageElements() {
    if (_currentPage >= _pages.length) return [];
    final page = _pages[_currentPage];
    final elements = page['elements'] as List? ?? page['questions'] as List? ?? [];
    return elements.cast<Map<String, dynamic>>();
  }

  bool _evaluateVisibleIf(String? visibleIf) {
    if (visibleIf == null || visibleIf.isEmpty) return true;
    // Basic expression parser for simple conditions like "{q1} = 'yes'"
    final regex = RegExp(r'\{(\w+)\}\s*(=|!=|<>|>|<|>=|<=|contains|notcontains)\s*' "'" r'?([^' "'" r'}\s]*)' "'" r'?');
    final match = regex.firstMatch(visibleIf);
    if (match == null) return true;

    final fieldName = match.group(1)!;
    final operator = match.group(2)!;
    final expectedValue = match.group(3)!;
    final actualValue = _responses[fieldName]?.toString() ?? '';

    switch (operator) {
      case '=':
        return actualValue == expectedValue;
      case '!=':
      case '<>':
        return actualValue != expectedValue;
      case 'contains':
        return actualValue.contains(expectedValue);
      case 'notcontains':
        return !actualValue.contains(expectedValue);
      default:
        return true;
    }
  }

  Future<void> _submitSurvey() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    final responseId = const Uuid().v4();
    await DatabaseHelper.instance.saveResponse(
      responseId,
      widget.surveyKey,
      Map<String, dynamic>.from(_responses),
    );

    // Trigger sync
    if (mounted) {
      context.read<SyncService>().syncNow();
    }

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: Colors.green, size: 48),
          title: const Text('Response Saved'),
          content: const Text(
              'Your response has been saved and will sync when connected to the internet.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                _resetForm();
              },
              child: const Text('Fill Another'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                Navigator.of(context).pop();
              },
              child: const Text('Done'),
            ),
          ],
        ),
      );
    }
  }

  void _resetForm() {
    setState(() {
      _responses.clear();
      _currentPage = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final elements = _getCurrentPageElements();
    final isLastPage = _currentPage >= _pages.length - 1;
    final pageTitle = _pages[_currentPage]['title'] as String? ?? _pages[_currentPage]['name'] as String?;

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.surveyName),
        bottom: _pages.length > 1
            ? PreferredSize(
                preferredSize: const Size.fromHeight(4),
                child: LinearProgressIndicator(
                  value: (_currentPage + 1) / _pages.length,
                ),
              )
            : null,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (pageTitle != null) ...[
              Text(pageTitle,
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
            ],
            if (_pages.length > 1)
              Text('Page ${_currentPage + 1} of ${_pages.length}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
            const SizedBox(height: 8),
            ...elements
                .where((q) => _evaluateVisibleIf(q['visibleIf'] as String?))
                .map(
                  (question) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: QuestionWidget(
                      question: question,
                      value: _responses[question['name']],
                      onChanged: (value) {
                        setState(() {
                          _responses[question['name'] as String] = value;
                        });
                      },
                    ),
                  ),
                ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_currentPage > 0)
                  OutlinedButton.icon(
                    onPressed: () => setState(() => _currentPage--),
                    icon: const Icon(Icons.arrow_back),
                    label: const Text('Previous'),
                  )
                else
                  const SizedBox(),
                if (isLastPage)
                  FilledButton.icon(
                    onPressed: _submitSurvey,
                    icon: const Icon(Icons.check),
                    label: const Text('Submit'),
                  )
                else
                  FilledButton.icon(
                    onPressed: () => setState(() => _currentPage++),
                    icon: const Icon(Icons.arrow_forward),
                    label: const Text('Next'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
