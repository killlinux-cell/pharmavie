import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/services/cart_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/utils/order_status.dart';
import 'package:pharmavie_mobile/features/ai/presentation/ai_chat_screen.dart';
import 'package:pharmavie_mobile/features/cart/presentation/cart_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/explore_tab.dart';
import 'package:pharmavie_mobile/features/home/presentation/home_tab.dart';
import 'package:pharmavie_mobile/features/orders/presentation/orders_tab.dart';
import 'package:pharmavie_mobile/features/profile/presentation/profile_tab.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;
  final _api = ApiClient();
  bool _authenticated = false;
  int _cartCount = 0;

  @override
  void initState() {
    super.initState();
    _checkAuth();
    CartService.instance.load().then((_) => _onCartChanged());
    CartService.instance.addListener(_onCartChanged);
  }

  @override
  void dispose() {
    CartService.instance.removeListener(_onCartChanged);
    super.dispose();
  }

  void _onCartChanged() {
    if (mounted) setState(() => _cartCount = CartService.instance.count);
  }

  Future<void> _checkAuth() async {
    final token = await _api.getToken();
    if (mounted) setState(() => _authenticated = token != null);
  }

  void _onAuthChanged() => _checkAuth();

  @override
  Widget build(BuildContext context) {
    final pages = [
      HomeTab(onAuthChanged: _onAuthChanged, authenticated: _authenticated),
      OrdersTab(authenticated: _authenticated, onNeedAuth: _checkAuth),
      const ExploreTab(),
      AiChatScreen(embedded: true),
      ProfileTab(authenticated: _authenticated, onAuthChanged: _onAuthChanged),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      floatingActionButton: _cartCount > 0
          ? FloatingActionButton.extended(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CartScreen())),
              backgroundColor: AppColors.brand600,
              icon: Badge(
                label: Text('$_cartCount'),
                child: const Icon(Icons.shopping_cart_outlined),
              ),
              label: Text('Panier · ${formatFcfa(CartService.instance.subtotal)}'),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Accueil'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), selectedIcon: Icon(Icons.receipt_long), label: 'Commandes'),
          NavigationDestination(icon: Icon(Icons.explore_outlined), selectedIcon: Icon(Icons.explore), label: 'Découvrir'),
          NavigationDestination(icon: Icon(Icons.auto_awesome_outlined), selectedIcon: Icon(Icons.auto_awesome), label: 'Assistant'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil'),
        ],
      ),
    );
  }
}
