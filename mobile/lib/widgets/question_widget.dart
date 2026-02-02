import 'package:flutter/material.dart';

class QuestionWidget extends StatelessWidget {
  final Map<String, dynamic> question;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;

  const QuestionWidget({
    super.key,
    required this.question,
    required this.value,
    required this.onChanged,
  });

  String get _type => (question['type'] as String? ?? 'text').toLowerCase();
  String get _title => question['title'] as String? ?? question['name'] as String? ?? '';
  bool get _isRequired => question['isRequired'] as bool? ?? false;
  String? get _inputType => question['inputType'] as String?;
  String? get _description => question['description'] as String?;

  List<Map<String, dynamic>> get _choices {
    final choices = question['choices'] as List?;
    if (choices == null) return [];
    return choices.map((c) {
      if (c is Map<String, dynamic>) return c;
      return {'value': c, 'text': c.toString()};
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            RichText(
              text: TextSpan(
                style: Theme.of(context).textTheme.titleSmall,
                children: [
                  TextSpan(text: _title),
                  if (_isRequired)
                    const TextSpan(text: ' *', style: TextStyle(color: Colors.red)),
                ],
              ),
            ),
            if (_description != null) ...[
              const SizedBox(height: 4),
              Text(_description!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey)),
            ],
            const SizedBox(height: 12),
            _buildInput(context),
          ],
        ),
      ),
    );
  }

  Widget _buildInput(BuildContext context) {
    switch (_type) {
      case 'text':
        return _buildTextInput();
      case 'comment':
        return _buildCommentInput();
      case 'radiogroup':
        return _buildRadioGroup();
      case 'checkbox':
        return _buildCheckboxGroup();
      case 'dropdown':
        return _buildDropdown();
      case 'rating':
        return _buildRating();
      case 'boolean':
        return _buildBoolean();
      case 'matrix':
        return _buildMatrix();
      case 'expression':
        return _buildExpression();
      case 'html':
        return const SizedBox();
      case 'paneldynamic':
        return _buildPanelDynamic(context);
      default:
        return _buildTextInput();
    }
  }

  Widget _buildTextInput() {
    TextInputType keyboardType = TextInputType.text;
    if (_inputType == 'number') {
      keyboardType = TextInputType.number;
    } else if (_inputType == 'email') {
      keyboardType = TextInputType.emailAddress;
    } else if (_inputType == 'tel') {
      keyboardType = TextInputType.phone;
    } else if (_inputType == 'url') {
      keyboardType = TextInputType.url;
    }

    return TextFormField(
      initialValue: value?.toString(),
      keyboardType: keyboardType,
      decoration: InputDecoration(
        hintText: question['placeholder'] as String? ?? 'Enter your answer',
        border: const OutlineInputBorder(),
      ),
      validator: _isRequired
          ? (v) => (v == null || v.isEmpty) ? 'This field is required' : null
          : null,
      onChanged: onChanged,
    );
  }

  Widget _buildCommentInput() {
    return TextFormField(
      initialValue: value?.toString(),
      maxLines: 4,
      decoration: InputDecoration(
        hintText: question['placeholder'] as String? ?? 'Enter your comments',
        border: const OutlineInputBorder(),
      ),
      validator: _isRequired
          ? (v) => (v == null || v.isEmpty) ? 'This field is required' : null
          : null,
      onChanged: onChanged,
    );
  }

  Widget _buildRadioGroup() {
    final choices = _choices;
    final currentValue = value?.toString();
    return RadioGroup<String>(
      groupValue: currentValue ?? '',
      onChanged: (v) => onChanged(v),
      child: Column(
        children: choices.map((choice) {
          final choiceValue = choice['value']?.toString() ?? '';
          final choiceText = choice['text']?.toString() ?? choiceValue;
          return RadioListTile<String>(
            title: Text(choiceText),
            value: choiceValue,
            contentPadding: EdgeInsets.zero,
            dense: true,
          );
        }).toList(),
      ),
    );
  }

  Widget _buildCheckboxGroup() {
    final choices = _choices;
    final selected = (value is List) ? List<String>.from(value) : <String>[];

    return Column(
      children: choices.map((choice) {
        final choiceValue = choice['value']?.toString() ?? '';
        final choiceText = choice['text']?.toString() ?? choiceValue;
        return CheckboxListTile(
          title: Text(choiceText),
          value: selected.contains(choiceValue),
          onChanged: (checked) {
            final updated = List<String>.from(selected);
            if (checked == true) {
              updated.add(choiceValue);
            } else {
              updated.remove(choiceValue);
            }
            onChanged(updated);
          },
          contentPadding: EdgeInsets.zero,
          dense: true,
        );
      }).toList(),
    );
  }

  Widget _buildDropdown() {
    final choices = _choices;
    return DropdownButtonFormField<String>(
      initialValue: value?.toString(),
      decoration: const InputDecoration(border: OutlineInputBorder()),
      hint: const Text('Select an option'),
      items: choices.map((choice) {
        final choiceValue = choice['value']?.toString() ?? '';
        final choiceText = choice['text']?.toString() ?? choiceValue;
        return DropdownMenuItem(value: choiceValue, child: Text(choiceText));
      }).toList(),
      onChanged: onChanged,
      validator: _isRequired ? (v) => v == null ? 'Please select an option' : null : null,
    );
  }

  Widget _buildRating() {
    final min = question['rateMin'] as int? ?? 1;
    final max = question['rateMax'] as int? ?? 5;
    final currentValue = (value is int) ? value as int : 0;

    return Row(
      children: List.generate(max - min + 1, (i) {
        final rating = min + i;
        return IconButton(
          icon: Icon(
            rating <= currentValue ? Icons.star : Icons.star_border,
            color: rating <= currentValue ? Colors.amber : Colors.grey,
          ),
          onPressed: () => onChanged(rating),
        );
      }),
    );
  }

  Widget _buildBoolean() {
    return SwitchListTile(
      title: Text(question['labelTrue'] as String? ?? 'Yes'),
      subtitle: Text(question['labelFalse'] as String? ?? 'No'),
      value: value == true,
      onChanged: onChanged,
      contentPadding: EdgeInsets.zero,
    );
  }

  Widget _buildMatrix() {
    final columns = (question['columns'] as List?)
            ?.map((c) => c is Map<String, dynamic> ? c : {'value': c, 'text': c.toString()})
            .toList() ??
        [];
    final rows = (question['rows'] as List?)
            ?.map((r) => r is Map<String, dynamic> ? r : {'value': r, 'text': r.toString()})
            .toList() ??
        [];

    final matrixValue = (value is Map<String, dynamic>) ? value as Map<String, dynamic> : <String, dynamic>{};

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: DataTable(
        columns: [
          const DataColumn(label: Text('')),
          ...columns.map((c) => DataColumn(label: Text(c['text']?.toString() ?? ''))),
        ],
        rows: rows.map((row) {
          final rowValue = row['value']?.toString() ?? '';
          final rowText = row['text']?.toString() ?? rowValue;
          return DataRow(cells: [
            DataCell(Text(rowText)),
            ...columns.map((col) {
              final colValue = col['value']?.toString() ?? '';
              return DataCell(
                RadioGroup<String>(
                  groupValue: matrixValue[rowValue]?.toString() ?? '',
                  onChanged: (v) {
                    final updated = Map<String, dynamic>.from(matrixValue);
                    updated[rowValue] = v;
                    onChanged(updated);
                  },
                  child: Radio<String>(
                    value: colValue,
                  ),
                ),
              );
            }),
          ]);
        }).toList(),
      ),
    );
  }

  Widget _buildExpression() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(value?.toString() ?? '—',
          style: const TextStyle(fontStyle: FontStyle.italic)),
    );
  }

  Widget _buildPanelDynamic(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          const Text('Repeat Group', style: TextStyle(fontStyle: FontStyle.italic, color: Colors.grey)),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () {
              // Repeat groups would be fully implemented in a production version
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Repeat groups: add entries for this section')),
              );
            },
            icon: const Icon(Icons.add),
            label: const Text('Add Entry'),
          ),
        ],
      ),
    );
  }
}
