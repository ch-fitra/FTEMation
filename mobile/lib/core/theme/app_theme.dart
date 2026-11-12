import 'package:flutter/material.dart';

abstract final class AppColors {
  static const highBackground = Color(0xFFDDF4EC),
      mediumBackground = Color(0xFFFFEED3);
  static const navy = Color(0xFF071E45),
      navySoft = Color(0xFF143762),
      primary = Color(0xFF006EAB),
      cyan = Color(0xFF00A8DC),
      text = Color(0xFF172E4D),
      muted = Color(0xFF5C6E85),
      border = Color(0xFFE0E7F0),
      canvas = Color(0xFFF4F6FA),
      surface = Colors.white;
}

abstract final class AppSpace {
  static const gap = 16.0, radius = 16.0;
}

ThemeData appTheme() => ThemeData(
  useMaterial3: true,
  scaffoldBackgroundColor: AppColors.canvas,
  colorScheme: ColorScheme.fromSeed(
    seedColor: AppColors.primary,
    primary: AppColors.primary,
    surface: AppColors.surface,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.navy,
    foregroundColor: Colors.white,
  ),
  textTheme: const TextTheme(
    headlineMedium: TextStyle(
      fontSize: 27,
      fontWeight: FontWeight.w700,
      color: AppColors.navy,
    ),
    titleLarge: TextStyle(
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: AppColors.navy,
    ),
    titleMedium: TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      color: AppColors.text,
    ),
    bodyMedium: TextStyle(fontSize: 14, height: 1.5, color: AppColors.text),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.surface,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.border),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
    ),
  ),
  bottomSheetTheme: const BottomSheetThemeData(
    backgroundColor: AppColors.surface,
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      minimumSize: const Size(48, 48),
      side: const BorderSide(color: AppColors.border),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      minimumSize: const Size(48, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
  ),
);
