import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class LocalPrefsService {
  LocalPrefsService._();
  static final instance = LocalPrefsService._();

  static const _favoritesKey = 'favorite_pharmacy_ids';
  static const _searchHistoryKey = 'search_history';
  static const _notifPrefsKey = 'notification_prefs';

  Future<List<String>> getFavoritePharmacyIds() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_favoritesKey) ?? [];
  }

  Future<bool> isFavoritePharmacy(String id) async {
    final ids = await getFavoritePharmacyIds();
    return ids.contains(id);
  }

  Future<void> toggleFavoritePharmacy(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final ids = List<String>.from(prefs.getStringList(_favoritesKey) ?? []);
    if (ids.contains(id)) {
      ids.remove(id);
    } else {
      ids.add(id);
    }
    await prefs.setStringList(_favoritesKey, ids);
  }

  Future<List<String>> getSearchHistory() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getStringList(_searchHistoryKey) ?? [];
  }

  Future<void> addSearchHistory(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return;
    final prefs = await SharedPreferences.getInstance();
    final history = List<String>.from(prefs.getStringList(_searchHistoryKey) ?? []);
    history.remove(trimmed);
    history.insert(0, trimmed);
    if (history.length > 10) history.removeRange(10, history.length);
    await prefs.setStringList(_searchHistoryKey, history);
  }

  Future<void> clearSearchHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_searchHistoryKey);
  }

  Future<Map<String, bool>> getNotificationPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_notifPrefsKey);
    if (raw == null) {
      return {
        'orderStatus': true,
        'promotions': false,
        'reminders': true,
        'pharmacyNews': false,
      };
    }
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    return decoded.map((k, v) => MapEntry(k, v as bool));
  }

  Future<void> setNotificationPref(String key, bool value) async {
    final prefs = await getNotificationPrefs();
    prefs[key] = value;
    final instance = await SharedPreferences.getInstance();
    await instance.setString(_notifPrefsKey, jsonEncode(prefs));
  }
}
