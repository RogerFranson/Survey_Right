import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart';
import 'services/api_service.dart';
import 'services/sync_service.dart';
import 'screens/key_entry_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize sqflite for different platforms
  if (kIsWeb) {
    // Web platform - use IndexedDB via sqflite_common_ffi_web
    databaseFactory = databaseFactoryFfiWeb;
  } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
    // Desktop platforms - use FFI
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  }
  // Mobile platforms (iOS/Android) use the default sqflite implementation

  await ApiService.instance.loadBaseUrl();
  runApp(const SurveyRightApp());
}

class SurveyRightApp extends StatelessWidget {
  const SurveyRightApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => SyncService(),
      child: MaterialApp(
        title: 'Survey Right',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
          useMaterial3: true,
        ),
        home: const KeyEntryScreen(),
      ),
    );
  }
}
