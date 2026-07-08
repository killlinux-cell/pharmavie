import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/features/shell/main_shell.dart';

void main() {
  runApp(const PharmaVieApp());
}

class PharmaVieApp extends StatelessWidget {
  const PharmaVieApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PharmaVie',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const MainShell(),
    );
  }
}
