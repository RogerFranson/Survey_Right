class SurveyDefinition {
  final String refid;
  final String name;
  final String? secname;
  final Map<String, dynamic> data;
  final DateTime? fetchedAt;

  SurveyDefinition({
    required this.refid,
    required this.name,
    this.secname,
    required this.data,
    this.fetchedAt,
  });

  factory SurveyDefinition.fromJson(Map<String, dynamic> json) {
    return SurveyDefinition(
      refid: json['refid'] as String,
      name: json['name'] as String,
      secname: json['secname'] as String?,
      data: json['data'] as Map<String, dynamic>,
      fetchedAt: DateTime.now(),
    );
  }
}

class SurveyQuestion {
  final String name;
  final String type;
  final String? title;
  final bool isRequired;
  final List<Map<String, dynamic>>? choices;
  final String? visibleIf;
  final String? inputType;
  final List<Map<String, dynamic>>? validators;
  final Map<String, dynamic>? extra;

  SurveyQuestion({
    required this.name,
    required this.type,
    this.title,
    this.isRequired = false,
    this.choices,
    this.visibleIf,
    this.inputType,
    this.validators,
    this.extra,
  });

  factory SurveyQuestion.fromJson(Map<String, dynamic> json) {
    return SurveyQuestion(
      name: json['name'] as String? ?? '',
      type: json['type'] as String? ?? 'text',
      title: json['title'] as String?,
      isRequired: json['isRequired'] as bool? ?? false,
      choices: (json['choices'] as List?)
          ?.map((c) => c is Map<String, dynamic>
              ? c
              : {'value': c, 'text': c.toString()})
          .toList(),
      visibleIf: json['visibleIf'] as String?,
      inputType: json['inputType'] as String?,
      validators: (json['validators'] as List?)
          ?.map((v) => v as Map<String, dynamic>)
          .toList(),
      extra: json,
    );
  }
}

class SurveyResponse {
  final String id;
  final String surveyKey;
  final Map<String, dynamic> responseData;
  final int syncStatus; // 0 = pending, 1 = synced, -1 = failed
  final DateTime createdAt;

  SurveyResponse({
    required this.id,
    required this.surveyKey,
    required this.responseData,
    this.syncStatus = 0,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'survey_key': surveyKey,
      'response_json': responseData.toString(),
      'sync_status': syncStatus,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
