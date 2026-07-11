import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:pharmavie_mobile/core/config/app_config.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiException implements Exception {
  ApiException(this.message, [this.statusCode = 0]);
  final String message;
  final int statusCode;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({String? baseUrl}) : baseUrl = baseUrl ?? kApiBaseUrl;

  final String baseUrl;
  static const _tokenKey = 'pharmavie_token';

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<Map<String, dynamic>> _handle(http.Response res) async {
    Map<String, dynamic> body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('Réponse serveur invalide (${res.statusCode})', res.statusCode);
    }
    if (res.statusCode >= 400) {
      final raw = body['message'];
      final message = raw is List
          ? raw.join(', ')
          : (raw ?? body['error'] ?? 'Erreur ${res.statusCode}').toString();
      throw ApiException(message, res.statusCode);
    }
    return body;
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = true,
  }) async {
    final headers = {'Content-Type': 'application/json'};
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    try {
      final res = await http.post(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
      return _handle(res);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Serveur injoignable. Lancez l\'API sur le port 3001.');
    }
  }

  Future<Map<String, dynamic>> get(String path, {bool auth = true}) async {
    final headers = {'Content-Type': 'application/json'};
    if (auth) {
      final token = await getToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }
    try {
      final res = await http.get(Uri.parse('$baseUrl$path'), headers: headers);
      return _handle(res);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Serveur injoignable. Lancez l\'API sur le port 3001.');
    }
  }

  Future<Map<String, dynamic>> patch(String path, Map<String, dynamic> body) async {
    final token = await getToken();
    try {
      final res = await http.patch(
        Uri.parse('$baseUrl$path'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode(body),
      );
      return _handle(res);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Serveur injoignable');
    }
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final token = await getToken();
    try {
      final res = await http.delete(
        Uri.parse('$baseUrl$path'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );
      return _handle(res);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Serveur injoignable');
    }
  }

  Future<Map<String, dynamic>> uploadFile(
    String path,
    String filePath, {
    String fieldName = 'image',
    Map<String, String>? fields,
    String? contentType,
  }) async {
    final token = await getToken();
    if (token == null) throw ApiException('Connexion requise', 401);
    try {
      final request = http.MultipartRequest('POST', Uri.parse('$baseUrl$path'));
      request.headers['Authorization'] = 'Bearer $token';
      if (fields != null) request.fields.addAll(fields);
      final mime = contentType ?? _mimeFromPath(filePath);
      request.files.add(await http.MultipartFile.fromPath(
        fieldName,
        filePath,
        contentType: MediaType.parse(mime),
      ));
      final streamed = await request.send();
      final res = await http.Response.fromStream(streamed);
      return _handle(res);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Échec envoi fichier');
    }
  }

  String _mimeFromPath(String filePath) {
    final ext = filePath.split('.').last.toLowerCase();
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'heic':
        return 'image/heic';
      case 'heif':
        return 'image/heif';
      case 'jpg':
      case 'jpeg':
      default:
        return 'image/jpeg';
    }
  }
}
