/// URL API — Android émulateur : 10.0.2.2 | iOS simulateur / web : localhost
const String kApiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://192.168.1.68:3001/api/v1',
);

/// URL racine serveur (fichiers statiques /uploads)
String get kMediaBaseUrl {
  final uri = Uri.parse(kApiBaseUrl);
  return '${uri.scheme}://${uri.host}:${uri.port}';
}

String mediaUrl(String path) {
  if (path.startsWith('http')) return path;
  return '$kMediaBaseUrl$path';
}
