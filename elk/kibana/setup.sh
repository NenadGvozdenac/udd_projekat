#!/bin/sh
# Kibana setup â€” run via: docker compose run --rm kibana-setup
# Uses Python 3 (python:3.11-alpine image) for reliable JSON handling
python3 << 'PYEOF'
import json, urllib.request, urllib.error, os, time, sys

KIBANA_URL = os.environ.get('KIBANA_URL', 'http://localhost:5601').rstrip('/')

def wait_for_kibana(max_retries=30):
    print('Waiting for Kibana...', flush=True)
    for i in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(f'{KIBANA_URL}/api/status')
            with urllib.request.urlopen(req, timeout=5) as r:
                if r.status == 200:
                    print('Kibana ready.\n', flush=True)
                    return True
        except Exception:
            pass
        print(f'  [{i}/{max_retries}] not ready, retrying in 5s...', flush=True)
        time.sleep(5)
    print('ERROR: Kibana not ready after max retries.', flush=True)
    return False

def post(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f'{KIBANA_URL}{path}', data=body,
        headers={'kbn-xsrf': 'true', 'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as r:
            print(f'  [OK]   {path}', flush=True)
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:300]
        if e.code == 409:
            print(f'  [SKIP] {path} â€” already exists', flush=True)
        else:
            print(f'  [ERR]  {path} [{e.code}]: {msg}', flush=True)
        return None

if not wait_for_kibana():
    sys.exit(1)

# â”€â”€ 1. Data view â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
print('Creating data view...', flush=True)
post('/api/data_views/data_view', {
    'data_view': {'id': 'udd-logs', 'title': 'udd-logs-*', 'timeFieldName': '@timestamp'}
})

# â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INDEX_REF = 'kibanaSavedObjectMeta.searchSourceJSON.index'

def search_source():
    return json.dumps({
        'indexRefName': INDEX_REF,
        'query': {'language': 'lucene', 'query': 'event_type: document_indexed'},
        'filter': []
    })

def vis_body(title, vis_state_obj):
    return {
        'attributes': {
            'title': title,
            'visState': json.dumps(vis_state_obj),
            'uiStateJSON': '{}',
            'description': '',
            'kibanaSavedObjectMeta': {'searchSourceJSON': search_source()}
        },
        'references': [
            {'id': 'udd-logs', 'name': INDEX_REF, 'type': 'index-pattern'}
        ]
    }

def bar_vis(title, field, size=10):
    return {
        'title': title,
        'type': 'horizontal_bar',
        'params': {
            'type': 'histogram',
            'grid': {'categoryLines': False},
            'categoryAxes': [{
                'id': 'CategoryAxis-1', 'type': 'category', 'position': 'left',
                'show': True, 'style': {}, 'scale': {'type': 'linear'},
                'labels': {'show': True, 'rotate': 0, 'filter': False, 'truncate': 200},
                'title': {}
            }],
            'valueAxes': [{
                'id': 'ValueAxis-1', 'name': 'LeftAxis-1', 'type': 'value',
                'position': 'bottom', 'show': True, 'style': {},
                'scale': {'type': 'linear', 'mode': 'normal'},
                'labels': {'show': True, 'rotate': 0, 'filter': False, 'truncate': 100},
                'title': {'text': 'Count'}
            }],
            'seriesParams': [{
                'show': True, 'type': 'histogram', 'mode': 'normal',
                'data': {'label': 'Count', 'id': '1'}, 'valueAxis': 'ValueAxis-1',
                'drawLinesBetweenPoints': True, 'showCircles': True
            }],
            'addTooltip': True, 'addLegend': True, 'legendPosition': 'right',
            'times': [], 'addTimeMarker': False
        },
        'aggs': [
            {'id': '1', 'enabled': True, 'type': 'count', 'schema': 'metric', 'params': {}},
            {'id': '2', 'enabled': True, 'type': 'terms', 'schema': 'segment', 'params': {
                'field': field, 'orderBy': '1', 'order': 'desc', 'size': size,
                'otherBucket': False, 'missingBucket': False
            }}
        ]
    }

# â”€â”€ 2. Top Cities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
print('Creating visualizations...', flush=True)
post('/api/saved_objects/visualization/udd-viz-top-cities',
     vis_body('Top Cities by Malware Reports',
              bar_vis('Top Cities by Malware Reports', 'city.keyword', 10)))

# â”€â”€ 3. Top 3 Analysts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
post('/api/saved_objects/visualization/udd-viz-top-analysts',
     vis_body('Top 3 Forensic Analysts by Incident Count',
              bar_vis('Top 3 Forensic Analysts by Incident Count', 'forensic_analyst_name.keyword', 3)))

# â”€â”€ 4. Malware distribution (pie) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
post('/api/saved_objects/visualization/udd-viz-malware-dist',
     vis_body('Malware/Threat Distribution', {
         'title': 'Malware/Threat Distribution',
         'type': 'pie',
         'params': {
             'type': 'pie', 'addTooltip': True, 'addLegend': True,
             'legendPosition': 'right', 'isDonut': False,
             'labels': {'show': False, 'values': True, 'last_level': True, 'truncate': 100}
         },
         'aggs': [
             {'id': '1', 'enabled': True, 'type': 'count', 'schema': 'metric', 'params': {}},
             {'id': '2', 'enabled': True, 'type': 'terms', 'schema': 'segment', 'params': {
                 'field': 'malware_name.keyword', 'orderBy': '1', 'order': 'desc',
                 'size': 20, 'otherBucket': False, 'missingBucket': False
             }}
         ]
     }))

# â”€â”€ 5. Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
print('Creating dashboard...', flush=True)
panels = [
    {'panelIndex': '1', 'gridData': {'x': 0,  'y': 0,  'w': 24, 'h': 15, 'i': '1'},
     'version': '8.13.4', 'panelRefName': 'panel_1', 'embeddableConfig': {}},
    {'panelIndex': '2', 'gridData': {'x': 24, 'y': 0,  'w': 24, 'h': 15, 'i': '2'},
     'version': '8.13.4', 'panelRefName': 'panel_2', 'embeddableConfig': {}},
    {'panelIndex': '3', 'gridData': {'x': 0,  'y': 15, 'w': 48, 'h': 20, 'i': '3'},
     'version': '8.13.4', 'panelRefName': 'panel_3', 'embeddableConfig': {}},
]
post('/api/saved_objects/dashboard/udd-dashboard', {
    'attributes': {
        'title': 'UDD Forensics Analytics',
        'description': 'Malware reports analytics dashboard',
        'panelsJSON': json.dumps(panels),
        'optionsJSON': json.dumps({'hidePanelTitles': False, 'useMargins': True}),
        'timeRestore': False,
        'kibanaSavedObjectMeta': {
            'searchSourceJSON': json.dumps({'query': {'language': 'lucene', 'query': ''}, 'filter': []})
        }
    },
    'references': [
        {'id': 'udd-viz-top-cities',   'name': 'panel_1', 'type': 'visualization'},
        {'id': 'udd-viz-top-analysts', 'name': 'panel_2', 'type': 'visualization'},
        {'id': 'udd-viz-malware-dist', 'name': 'panel_3', 'type': 'visualization'},
    ]
})

print(f'\nDone! Dashboard: {KIBANA_URL}/app/dashboards', flush=True)
PYEOF
