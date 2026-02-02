import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/database_helper.dart';
import '../services/sync_service.dart';
import 'survey_form_screen.dart';

class KeyEntryScreen extends StatefulWidget {
  const KeyEntryScreen({super.key});

  @override
  State<KeyEntryScreen> createState() => _KeyEntryScreenState();
}

class _KeyEntryScreenState extends State<KeyEntryScreen> {
  final _keyController = TextEditingController();
  final _serverController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _serverController.text = ApiService.instance.baseUrl;
  }

  @override
  void dispose() {
    _keyController.dispose();
    _serverController.dispose();
    super.dispose();
  }

  Future<void> _loadSurvey() async {
    final key = _keyController.text.trim();
    if (key.isEmpty) {
      setState(() => _error = 'Please enter a survey key');
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    // Update server URL if changed
    final serverUrl = _serverController.text.trim();
    if (serverUrl.isNotEmpty) {
      await ApiService.instance.setBaseUrl(serverUrl);
    }

    // Try fetching from API first
    final surveyJson = await ApiService.instance.fetchSurvey(key);

    if (surveyJson != null) {
      // Cache it locally
      await DatabaseHelper.instance.cacheSurvey(
        surveyJson['refid'] as String,
        surveyJson['name'] as String,
        surveyJson['secname'] as String?,
        surveyJson['data'] as Map<String, dynamic>,
      );

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SurveyFormScreen(
              surveyKey: key,
              surveyName: surveyJson['name'] as String,
              surveyData: surveyJson['data'] as Map<String, dynamic>,
            ),
          ),
        );
      }
    } else {
      // Try loading from cache
      final cached = await DatabaseHelper.instance.getCachedSurvey(key);
      if (cached != null && mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => SurveyFormScreen(
              surveyKey: key,
              surveyName: cached['name'] as String,
              surveyData: cached['data'] as Map<String, dynamic>,
            ),
          ),
        );
      } else {
        setState(() => _error = 'Survey not found. Check the key and server connection.');
      }
    }

    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final syncService = context.watch<SyncService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Survey Right'),
        actions: [
          if (syncService.pendingCount > 0)
            Badge(
              label: Text('${syncService.pendingCount}'),
              child: IconButton(
                icon: Icon(syncService.isSyncing ? Icons.sync : Icons.cloud_upload),
                onPressed: () {
                  syncService.syncNow();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Syncing responses...')),
                  );
                },
                tooltip: '${syncService.pendingCount} pending sync',
              ),
            ),
          if (syncService.lastError != null)
            IconButton(
              icon: const Icon(Icons.error_outline, color: Colors.red),
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Sync Error'),
                    content: Text(syncService.lastError!),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('OK'),
                      ),
                    ],
                  ),
                );
              },
              tooltip: 'Sync error',
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 40),
            Icon(Icons.poll_outlined, size: 80, color: Theme.of(context).primaryColor),
            const SizedBox(height: 16),
            Text(
              'Enter Survey Key',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Enter the key provided by your survey administrator',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _keyController,
              decoration: InputDecoration(
                labelText: 'Survey Key',
                hintText: 'e.g. household-survey-2024',
                prefixIcon: const Icon(Icons.key),
                border: const OutlineInputBorder(),
                errorText: _error,
              ),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _loadSurvey(),
            ),
            const SizedBox(height: 16),
            ExpansionTile(
              title: const Text('Server Settings'),
              leading: const Icon(Icons.settings),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: TextField(
                    controller: _serverController,
                    decoration: const InputDecoration(
                      labelText: 'Server URL',
                      hintText: 'http://your-server:8080',
                      prefixIcon: Icon(Icons.cloud),
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _isLoading ? null : _loadSurvey,
              icon: _isLoading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.download),
              label: Text(_isLoading ? 'Loading...' : 'Load Survey'),
            ),
          ],
        ),
      ),
    );
  }
}
