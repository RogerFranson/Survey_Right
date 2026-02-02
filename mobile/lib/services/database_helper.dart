import 'dart:convert';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:path/path.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('survey_right.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await databaseFactory.getDatabasesPath();
    final path = join(dbPath, filePath);
    return await databaseFactory.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: 1,
        onCreate: (db, version) => _createDB(db, version),
      ),
    );
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE survey_cache (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        secname TEXT,
        json_data TEXT NOT NULL,
        fetched_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE response_outbox (
        id TEXT PRIMARY KEY,
        survey_key TEXT NOT NULL,
        response_json TEXT NOT NULL,
        sync_status INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    ''');
  }

  // Survey cache operations
  Future<void> cacheSurvey(String key, String name, String? secname, Map<String, dynamic> data) async {
    final db = await database;
    await db.insert('survey_cache', {
      'key': key,
      'name': name,
      'secname': secname,
      'json_data': jsonEncode(data),
      'fetched_at': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<Map<String, dynamic>?> getCachedSurvey(String key) async {
    final db = await database;
    final result = await db.query('survey_cache', where: 'key = ?', whereArgs: [key]);
    if (result.isEmpty) return null;
    final row = result.first;
    return {
      'refid': row['key'],
      'name': row['name'],
      'secname': row['secname'],
      'data': jsonDecode(row['json_data'] as String),
      'fetched_at': row['fetched_at'],
    };
  }

  // Response outbox operations
  Future<void> saveResponse(String id, String surveyKey, Map<String, dynamic> responseData) async {
    final db = await database;
    await db.insert('response_outbox', {
      'id': id,
      'survey_key': surveyKey,
      'response_json': jsonEncode(responseData),
      'sync_status': 0,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<Map<String, dynamic>>> getPendingResponses() async {
    final db = await database;
    return await db.query('response_outbox',
        where: 'sync_status = ?', whereArgs: [0], orderBy: 'created_at ASC');
  }

  Future<void> markSynced(String id) async {
    final db = await database;
    await db.update('response_outbox', {'sync_status': 1},
        where: 'id = ?', whereArgs: [id]);
  }

  Future<void> markFailed(String id) async {
    final db = await database;
    await db.update('response_outbox', {'sync_status': -1},
        where: 'id = ?', whereArgs: [id]);
  }

  Future<List<Map<String, dynamic>>> getAllResponses(String surveyKey) async {
    final db = await database;
    return await db.query('response_outbox',
        where: 'survey_key = ?',
        whereArgs: [surveyKey],
        orderBy: 'created_at DESC');
  }

  Future<Map<String, int>> getSyncStats(String surveyKey) async {
    final db = await database;
    final all = await db.rawQuery(
        'SELECT sync_status, COUNT(*) as count FROM response_outbox WHERE survey_key = ? GROUP BY sync_status',
        [surveyKey]);
    final stats = <String, int>{'total': 0, 'synced': 0, 'pending': 0, 'failed': 0};
    for (final row in all) {
      final status = row['sync_status'] as int;
      final count = row['count'] as int;
      stats['total'] = (stats['total'] ?? 0) + count;
      if (status == 1) stats['synced'] = count;
      if (status == 0) stats['pending'] = count;
      if (status == -1) stats['failed'] = count;
    }
    return stats;
  }
}
