import 'package:flutter_test/flutter_test.dart';
import 'package:survey_mobile/main.dart';

void main() {
  testWidgets('App starts with key entry screen', (WidgetTester tester) async {
    await tester.pumpWidget(const SurveyRightApp());
    expect(find.text('Survey Right'), findsOneWidget);
    expect(find.text('Enter Survey Key'), findsOneWidget);
  });
}
