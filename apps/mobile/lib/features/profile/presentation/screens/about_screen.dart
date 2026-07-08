import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'À propos',
      badge: 'Info',
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Center(
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppColors.brand500, AppColors.brand700]),
                borderRadius: BorderRadius.circular(24),
              ),
              alignment: Alignment.center,
              child: const Text('P', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 16),
          const Text('PharmaVie', textAlign: TextAlign.center, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const Text('Version 1.0.0 · Côte d\'Ivoire', textAlign: TextAlign.center, style: TextStyle(color: AppColors.slate500)),
          const SizedBox(height: 24),
          const Text(
            'PharmaVie connecte patients et pharmacies en Côte d\'Ivoire : recherche de médicaments, commande, paiement Mobile Money et assistant santé IA.',
            style: TextStyle(height: 1.5, color: AppColors.slate600),
          ),
          const SizedBox(height: 24),
          _InfoRow(label: 'Support', value: 'support@pharmavie.ci'),
          _InfoRow(label: 'Site web', value: 'www.pharmavie.ci'),
          _InfoRow(label: 'Licence', value: 'MVP — usage interne'),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(color: AppColors.slate500))),
          Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
        ],
      ),
    );
  }
}
