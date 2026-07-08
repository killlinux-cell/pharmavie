import 'package:flutter_test/flutter_test.dart';
import 'package:pharmavie_mobile/main.dart';

void main() {
  testWidgets('Affiche la navigation principale PharmaVie', (WidgetTester tester) async {
    await tester.pumpWidget(const PharmaVieApp());

    expect(find.text('PharmaVie'), findsOneWidget);
    expect(find.text('Accueil'), findsOneWidget);
    expect(find.text('Commandes'), findsOneWidget);
  });
}
