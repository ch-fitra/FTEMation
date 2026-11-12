import 'package:flutter/material.dart';

class AppDestination {
  const AppDestination(this.path, this.label, this.icon);
  final String path, label;
  final IconData icon;
}

const destinations = [
  AppDestination('/datasets', 'Import Dataset', Icons.upload_file_outlined),
  AppDestination('/analysis', 'Analisis AI', Icons.auto_awesome_outlined),
  AppDestination('/overview', 'Overview', Icons.grid_view_rounded),
  AppDestination('/results', 'Hasil Analisis', Icons.fact_check_outlined),
  AppDestination('/activities', 'Data Aktivitas', Icons.list_alt_rounded),
];
