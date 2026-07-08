import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/app_widgets.dart';
import 'package:pharmavie_mobile/features/auth/presentation/auth_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/notifications_preview_screen.dart';
import 'package:pharmavie_mobile/features/profile/presentation/screens/addresses_screen.dart';
import 'package:pharmavie_mobile/features/profile/presentation/screens/about_screen.dart';
import 'package:pharmavie_mobile/features/profile/presentation/screens/advanced_settings_screen.dart';
import 'package:pharmavie_mobile/features/profile/presentation/screens/edit_profile_screen.dart';
import 'package:pharmavie_mobile/features/profile/presentation/screens/favorite_pharmacies_screen.dart';
import 'package:pharmavie_mobile/features/profile/presentation/screens/help_center_screen.dart';
import 'package:pharmavie_mobile/features/profile/presentation/screens/order_history_screen.dart';

class ProfileTab extends StatefulWidget {
  const ProfileTab({super.key, required this.authenticated, required this.onAuthChanged});

  final bool authenticated;
  final VoidCallback onAuthChanged;

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  final _api = ApiClient();
  Map<String, dynamic>? _profile;

  @override
  void initState() {
    super.initState();
    if (widget.authenticated) _loadProfile();
  }

  @override
  void didUpdateWidget(covariant ProfileTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.authenticated && !oldWidget.authenticated) _loadProfile();
    if (!widget.authenticated) setState(() => _profile = null);
  }

  Future<void> _loadProfile() async {
    try {
      final res = await _api.get('/auth/me');
      setState(() => _profile = res['data'] as Map<String, dynamic>);
    } catch (_) {}
  }

  Future<void> _logout() async {
    await _api.clearToken();
    widget.onAuthChanged();
    setState(() => _profile = null);
  }

  Future<void> _login() async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AuthScreen(onAuthenticated: () {
          Navigator.pop(context);
          widget.onAuthChanged();
          _loadProfile();
        }),
      ),
    );
  }

  void _open(Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  void _openLocked(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.authenticated) {
      return Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Spacer(),
                const PharmaLogo(size: 72),
                const SizedBox(height: 24),
                const Text('Mon profil', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text(
                  'Connectez-vous pour accéder à votre compte, adresses et préférences',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.slate500),
                ),
                const SizedBox(height: 32),
                SizedBox(width: double.infinity, child: ElevatedButton(onPressed: _login, child: const Text('Se connecter'))),
                const Spacer(flex: 2),
              ],
            ),
          ),
        ),
      );
    }

    final name = [_profile?['firstName'], _profile?['lastName']].whereType<String>().join(' ');
    final phone = _profile?['phone'] as String? ?? '';
    final initials = name.isNotEmpty
        ? name.split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join().toUpperCase()
        : 'PV';

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            const Text('Profil', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                border: Border.all(color: AppColors.border),
              ),
              child: InkWell(
                onTap: () => _open(EditProfileScreen(
                  profile: _profile ?? {},
                  onSaved: _loadProfile,
                )),
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: AppColors.brand100,
                      child: Text(initials, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.brand700)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(name.isNotEmpty ? name : 'Client PharmaVie', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                          const SizedBox(height: 4),
                          Text(phone, style: const TextStyle(color: AppColors.slate500)),
                          const SizedBox(height: 6),
                          const StatusBadge(
                            label: 'Client',
                            color: AppColors.brand700,
                            bgColor: AppColors.brand50,
                            icon: Icons.verified_user_outlined,
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.edit_outlined, color: AppColors.brand600, size: 20),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text('Mon compte', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            _MenuTile(
              icon: Icons.history,
              title: 'Historique commandes',
              subtitle: 'Toutes vos commandes passées',
              locked: false,
              onTap: () => _open(const OrderHistoryScreen()),
            ),
            _MenuTile(
              icon: Icons.favorite_border,
              title: 'Pharmacies favorites',
              subtitle: 'Accès rapide à vos officines',
              locked: false,
              onTap: () => _open(const FavoritePharmaciesScreen()),
            ),
            _MenuTile(
              icon: Icons.location_on_outlined,
              title: 'Mes adresses',
              subtitle: 'Gérer les adresses de livraison',
              locked: false,
              onTap: () => _open(const AddressesScreen()),
            ),
            _MenuTile(
              icon: Icons.payment_outlined,
              title: 'Moyens de paiement',
              subtitle: 'Orange Money, MTN, Wave',
              locked: true,
              onTap: () => _openLocked(context, 'Enregistrement des moyens de paiement — bientôt'),
            ),
            _MenuTile(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              subtitle: 'Préférences alertes',
              locked: false,
              onTap: () => _open(const NotificationsPreviewScreen()),
            ),
            _MenuTile(
              icon: Icons.tune,
              title: 'Paramètres avancés',
              subtitle: 'Confidentialité et données',
              locked: false,
              onTap: () => _open(const AdvancedSettingsScreen()),
            ),
            const SizedBox(height: 16),
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: Text('Support', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            _MenuTile(
              icon: Icons.help_outline,
              title: 'Centre d\'aide',
              subtitle: 'FAQ et assistance',
              locked: false,
              onTap: () => _open(const HelpCenterScreen()),
            ),
            _MenuTile(
              icon: Icons.info_outline,
              title: 'À propos',
              subtitle: 'PharmaVie v1.0 · Côte d\'Ivoire',
              locked: false,
              onTap: () => _open(const AboutScreen()),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: _logout,
              icon: const Icon(Icons.logout, color: AppColors.red600),
              label: const Text('Déconnexion', style: TextStyle(color: AppColors.red600)),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                side: const BorderSide(color: AppColors.red600),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.locked = false,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool locked;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border),
            ),
            child: Row(
              children: [
                Icon(icon, color: locked ? AppColors.slate400 : AppColors.brand600),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: TextStyle(fontWeight: FontWeight.w500, color: locked ? AppColors.slate500 : AppColors.slate900)),
                      Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
                    ],
                  ),
                ),
                Icon(locked ? Icons.lock_outline : Icons.chevron_right, size: 18, color: AppColors.slate400),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
