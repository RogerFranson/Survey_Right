import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/database_helper.dart';

class HistoryScreen extends StatefulWidget {
  final String surveyKey;

  const HistoryScreen({super.key, required this.surveyKey});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Map<String, dynamic>> _responses = [];

  @override
  void initState() {
    super.initState();
    _loadResponses();
  }

  Future<void> _loadResponses() async {
    final responses = await DatabaseHelper.instance.getAllResponses(widget.surveyKey);
    setState(() => _responses = responses);
  }

  Color _statusColor(int status) {
    switch (status) {
      case 1:
        return Colors.green;
      case -1:
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  String _statusText(int status) {
    switch (status) {
      case 1:
        return 'Synced';
      case -1:
        return 'Failed';
      default:
        return 'Pending';
    }
  }

  IconData _statusIcon(int status) {
    switch (status) {
      case 1:
        return Icons.cloud_done;
      case -1:
        return Icons.cloud_off;
      default:
        return Icons.cloud_upload;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Submission History')),
      body: _responses.isEmpty
          ? const Center(child: Text('No submissions yet'))
          : ListView.builder(
              itemCount: _responses.length,
              itemBuilder: (context, index) {
                final r = _responses[index];
                final status = r['sync_status'] as int;
                final createdAt = DateTime.parse(r['created_at'] as String);
                Map<String, dynamic>? data;
                try {
                  data = jsonDecode(r['response_json'] as String) as Map<String, dynamic>;
                } catch (_) {}

                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: ListTile(
                    leading: Icon(_statusIcon(status), color: _statusColor(status)),
                    title: Text('Response ${index + 1}'),
                    subtitle: Text(
                      '${createdAt.toLocal().toString().substring(0, 19)}\n'
                      '${data != null ? "${data.length} fields" : ""}',
                    ),
                    trailing: Chip(
                      label: Text(_statusText(status),
                          style: TextStyle(color: _statusColor(status), fontSize: 12)),
                      side: BorderSide(color: _statusColor(status)),
                      backgroundColor: _statusColor(status).withValues(alpha: 0.1),
                    ),
                    isThreeLine: true,
                    onTap: data != null
                        ? () => _showDetail(context, data!, createdAt)
                        : null,
                  ),
                );
              },
            ),
    );
  }

  void _showDetail(BuildContext context, Map<String, dynamic> data, DateTime createdAt) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.all(16),
          children: [
            Text('Response Detail',
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text('Submitted: ${createdAt.toLocal()}',
                style: Theme.of(context).textTheme.bodySmall),
            const Divider(height: 24),
            ...data.entries.map((e) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(e.key,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                      const SizedBox(height: 2),
                      Text(e.value?.toString() ?? '—',
                          style: const TextStyle(fontSize: 15)),
                    ],
                  ),
                )),
          ],
        ),
      ),
    );
  }
}
