import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CartItem {
  CartItem({
    required this.productId,
    required this.productName,
    required this.pharmacyId,
    required this.pharmacyName,
    required this.price,
    required this.requiresRx,
    this.quantity = 1,
  });

  final String productId;
  final String productName;
  final String pharmacyId;
  final String pharmacyName;
  final int price;
  final bool requiresRx;
  int quantity;

  int get lineTotal => price * quantity;

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'productName': productName,
        'pharmacyId': pharmacyId,
        'pharmacyName': pharmacyName,
        'price': price,
        'requiresRx': requiresRx,
        'quantity': quantity,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        productId: json['productId'] as String,
        productName: json['productName'] as String,
        pharmacyId: json['pharmacyId'] as String,
        pharmacyName: json['pharmacyName'] as String,
        price: json['price'] as int,
        requiresRx: json['requiresRx'] == true,
        quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      );
}

class CartService {
  CartService._();
  static final instance = CartService._();

  static const _storageKey = 'pharmavie_cart';
  final List<CartItem> _items = [];
  final List<void Function()> _listeners = [];

  List<CartItem> get items => List.unmodifiable(_items);
  int get count => _items.fold(0, (sum, i) => sum + i.quantity);
  int get subtotal => _items.fold(0, (sum, i) => sum + i.lineTotal);
  bool get isEmpty => _items.isEmpty;
  bool get hasRxItems => _items.any((i) => i.requiresRx);

  String? get pharmacyId => _items.isEmpty ? null : _items.first.pharmacyId;
  String? get pharmacyName => _items.isEmpty ? null : _items.first.pharmacyName;

  void addListener(void Function() listener) => _listeners.add(listener);
  void removeListener(void Function() listener) => _listeners.remove(listener);

  void _notify() {
    for (final l in List.of(_listeners)) {
      l();
    }
    _persist();
  }

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_storageKey);
    _items.clear();
    if (raw != null) {
      final list = jsonDecode(raw) as List<dynamic>;
      _items.addAll(list.map((e) => CartItem.fromJson(e as Map<String, dynamic>)));
    }
    _notifyListenersOnly();
  }

  void _notifyListenersOnly() {
    for (final l in List.of(_listeners)) {
      l();
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_storageKey, jsonEncode(_items.map((i) => i.toJson()).toList()));
  }

  /// Retourne false si pharmacie différente (conflit).
  bool canAdd(String pharmacyId) => _items.isEmpty || _items.first.pharmacyId == pharmacyId;

  void add(CartItem item) {
    final existing = _items.where((i) => i.productId == item.productId).firstOrNull;
    if (existing != null) {
      existing.quantity += item.quantity;
    } else {
      _items.add(item);
    }
    _notify();
  }

  void updateQuantity(String productId, int quantity) {
    final item = _items.where((i) => i.productId == productId).firstOrNull;
    if (item == null) return;
    if (quantity <= 0) {
      _items.remove(item);
    } else {
      item.quantity = quantity;
    }
    _notify();
  }

  void remove(String productId) {
    _items.removeWhere((i) => i.productId == productId);
    _notify();
  }

  void clear() {
    _items.clear();
    _notify();
  }
}
