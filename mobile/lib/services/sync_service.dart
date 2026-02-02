import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'database_helper.dart';
import 'api_service.dart';

class SyncService extends ChangeNotifier {
  final DatabaseHelper _db = DatabaseHelper.instance;
  final ApiService _api = ApiService.instance;
  Timer? _syncTimer;
  bool _isSyncing = false;
  int _pendingCount = 0;
  String? _lastError;

  int get pendingCount => _pendingCount;
  bool get isSyncing => _isSyncing;
  String? get lastError => _lastError;

  SyncService() {
    _startPeriodicSync();
    _listenConnectivity();
    // Run initial sync after a short delay
    Future.delayed(const Duration(seconds: 2), () => syncNow());
  }

  void _startPeriodicSync() {
    _syncTimer = Timer.periodic(const Duration(seconds: 15), (_) => syncNow());
  }

  void _listenConnectivity() {
    Connectivity().onConnectivityChanged.listen((results) {
      if (results.any((r) => r != ConnectivityResult.none)) {
        debugPrint('[SyncService] Connectivity restored, syncing...');
        syncNow();
      }
    });
  }

  Future<void> syncNow() async {
    if (_isSyncing) return;
    _isSyncing = true;
    _lastError = null;
    notifyListeners();

    try {
      final pending = await _db.getPendingResponses();
      _pendingCount = pending.length;
      notifyListeners();

      if (pending.isEmpty) {
        debugPrint('[SyncService] No pending responses to sync');
        return;
      }

      debugPrint('[SyncService] Syncing ${pending.length} pending response(s)...');

      for (final row in pending) {
        final id = row['id'] as String;
        final surveyKey = row['survey_key'] as String;
        final responseJson = row['response_json'] as String;

        Map<String, dynamic> data;
        try {
          data = jsonDecode(responseJson) as Map<String, dynamic>;
        } catch (e) {
          debugPrint('[SyncService] Failed to parse response JSON for $id: $e');
          await _db.markFailed(id);
          continue;
        }

        // Get survey metadata from cache for name/secname
        String surveyName = '';
        String? secname;
        final cached = await _db.getCachedSurvey(surveyKey);
        if (cached != null) {
          surveyName = cached['name'] as String? ?? '';
          secname = cached['secname'] as String?;
        }

        debugPrint('[SyncService] Submitting response $id for survey $surveyKey to ${_api.baseUrl}');
        final result = await _api.submitResponse(surveyKey, surveyName, secname, data);

        if (result.success) {
          await _db.markSynced(id);
          _pendingCount--;
          debugPrint('[SyncService] Response $id synced successfully');
          notifyListeners();
        } else {
          _lastError = result.error;
          debugPrint('[SyncService] Failed to sync response $id: ${result.error}');
          // Continue trying other responses instead of breaking
        }
      }
    } catch (e) {
      _lastError = e.toString();
      debugPrint('[SyncService] Sync error: $e');
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }

  Future<void> updatePendingCount() async {
    final pending = await _db.getPendingResponses();
    _pendingCount = pending.length;
    notifyListeners();
  }

  @override
  void dispose() {
    _syncTimer?.cancel();
    super.dispose();
  }
}
