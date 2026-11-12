// Display formatting only; workload values are supplied by Laravel.
String number(dynamic value) => value == null
    ? '\u2014'
    : num.parse('$value').toStringAsFixed(4).replaceAll('.', ',');
const frequencyLabels = {
  'daily': 'Harian',
  'weekly': 'Mingguan',
  'monthly': 'Bulanan',
};
