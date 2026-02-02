import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiResult {
  final bool success;
  final String? error;

  ApiResult({required this.success, this.error});
}

class ApiService {
  static const String _defaultBaseUrl = 'http://localhost:3080';
  String _baseUrl = _defaultBaseUrl;

  static final ApiService instance = ApiService._init();
  ApiService._init();

  Future<void> loadBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('server_url');
    if (saved == null || saved == 'http://localhost:8080') {
      // Migrate from old default port to new
      _baseUrl = _defaultBaseUrl;
      await prefs.setString('server_url', _defaultBaseUrl);
    } else {
      _baseUrl = saved;
    }
  }

  Future<void> setBaseUrl(String url) async {
    _baseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', url);
  }

  String get baseUrl => _baseUrl;

  Future<Map<String, dynamic>?> fetchSurvey(String refid) async {
    try {
      debugPrint('[API] Fetching survey: $_baseUrl/api/surveys/$refid');
      final response = await http
          .get(Uri.parse('$_baseUrl/api/surveys/$refid'))
          .timeout(const Duration(seconds: 10));
      debugPrint('[API] Fetch response: ${response.statusCode}');
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('[API] Fetch survey error: $e');
      return null;
    }
  }

  Future<ApiResult> submitResponse(String refid, String? name, String? secname,
      Map<String, dynamic> data) async {
    try {
      final body = jsonEncode({
        'refid': refid,
        'name': name ?? '',
        'secname': secname ?? '',
        'data': data,
      });
      debugPrint('[API] Submitting response to: $_baseUrl/api/responses');
      debugPrint('[API] Request body: $body');

      final response = await http
          .post(
            Uri.parse('$_baseUrl/api/responses'),
            headers: {'Content-Type': 'application/json'},
            body: body,
          )
          .timeout(const Duration(seconds: 10));

      debugPrint('[API] Submit response: ${response.statusCode} ${response.body}');

      if (response.statusCode == 201) {
        return ApiResult(success: true);
      } else {
        return ApiResult(
          success: false,
          error: 'HTTP ${response.statusCode}: ${response.body}',
        );
      }
    } catch (e) {
      debugPrint('[API] Submit error: $e');
      return ApiResult(success: false, error: e.toString());
    }
  }

  Future<int> bulkSubmitResponses(
      List<Map<String, dynamic>> responses) async {
    try {
      final response = await http
          .post(
            Uri.parse('$_baseUrl/api/responses/bulk'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'responses': responses}),
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 201) {
        final body = jsonDecode(response.body);
        return body['count'] as int;
      }
      return 0;
    } catch (e) {
      debugPrint('[API] Bulk submit error: $e');
      return 0;
    }
  }
}
