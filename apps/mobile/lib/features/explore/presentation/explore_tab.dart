import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/app_widgets.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/barcode_scan_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/digital_prescriptions_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/loyalty_program_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/notifications_preview_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/pharmacy_map_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/price_compare_screen.dart';
import 'package:pharmavie_mobile/features/explore/presentation/screens/specialists_directory_screen.dart';

class ExploreTab extends StatelessWidget {
  const ExploreTab({super.key});

  void _open(BuildContext context, Widget screen) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          children: [
            const Text('Découvrir', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text(
              'Explorez les fonctionnalités PharmaVie',
              style: TextStyle(color: AppColors.slate500, fontSize: 13),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.brand600, AppColors.brand700],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.rocket_launch, color: Colors.white, size: 32),
                  SizedBox(height: 12),
                  Text(
                    'PharmaVie évolue',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Découvrez les nouveautés — certaines en aperçu, d\'autres arrivent bientôt.',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Padding(
              padding: EdgeInsets.only(left: 0, bottom: 8),
              child: Text('Fonctionnalités', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            ComingSoonCard(
              icon: Icons.map_outlined,
              title: 'Carte interactive',
              description: 'Visualisez les pharmacies sur une carte avec filtres de garde et distance.',
              previewAvailable: true,
              onTap: () => _open(context, const PharmacyMapScreen()),
            ),
            const SizedBox(height: 12),
            ComingSoonCard(
              icon: Icons.notifications_active_outlined,
              title: 'Notifications push',
              description: 'Alertes commande, rappels médicaments et promos pharmacies.',
              previewAvailable: true,
              onTap: () => _open(context, const NotificationsPreviewScreen()),
            ),
            const SizedBox(height: 12),
            ComingSoonCard(
              icon: Icons.qr_code_scanner,
              title: 'Scan code-barres',
              description: 'Scannez un médicament pour trouver instantanément où l\'acheter.',
              previewAvailable: true,
              onTap: () => _open(context, const BarcodeScanScreen()),
            ),
            const SizedBox(height: 12),
            ComingSoonCard(
              icon: Icons.card_giftcard_outlined,
              title: 'Programme fidélité',
              description: 'Points et réductions chez vos pharmacies partenaires.',
              previewAvailable: false,
              onTap: () => _open(context, const LoyaltyProgramScreen()),
            ),
            const SizedBox(height: 12),
            ComingSoonCard(
              icon: Icons.compare_arrows,
              title: 'Comparateur de prix',
              description: 'Comparez les prix d\'un même médicament entre pharmacies et signalez les anomalies.',
              previewAvailable: true,
              onTap: () => _open(context, const PriceCompareScreen()),
            ),
            const SizedBox(height: 12),
            ComingSoonCard(
              icon: Icons.local_hospital_outlined,
              title: 'Annuaire spécialistes',
              description: 'Trouvez médecins et centres de santé recommandés par l\'assistant IA.',
              previewAvailable: true,
              onTap: () => _open(context, const SpecialistsDirectoryScreen()),
            ),
            const SizedBox(height: 12),
            ComingSoonCard(
              icon: Icons.description_outlined,
              title: 'Ordonnances numériques',
              description: 'Importez et validez vos ordonnances pour commander des médicaments sur prescription.',
              previewAvailable: true,
              onTap: () => _open(context, const DigitalPrescriptionsScreen()),
            ),
          ],
        ),
      ),
    );
  }
}
