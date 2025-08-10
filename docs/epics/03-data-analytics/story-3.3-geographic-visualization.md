# Story 3.3: Geographic Data Visualization

**Epic**: Data Analytics Dashboard  
**Assigned Agent**: 🎨 Frontend Developer  
**Story Points**: 13  
**Priority**: High  
**Sprint**: 3

## User Story
**As a** campaign strategist  
**I want** interactive map visualizations showing geographic voting patterns  
**So that** I can identify target areas and optimize field operations  

## Acceptance Criteria
- [ ] Interactive map component using Mapbox or Leaflet
- [ ] Precinct boundaries displayed with PostGIS data
- [ ] Color-coded precincts by response density
- [ ] Heat map overlay for survey concentrations  
- [ ] Clickable precincts showing detailed metrics
- [ ] Responsive design for mobile and desktop
- [ ] Spanish language interface and labels
- [ ] Real-time data updates on map
- [ ] Export map visualizations as images

## Technical Requirements
### Map Implementation Options
**Primary Choice: Mapbox GL JS**
- Better performance with large datasets
- Custom styling capabilities
- Built-in clustering and heat maps
- Puerto Rico map tiles available

**Alternative: React Leaflet**
- Open source solution
- Lighter weight implementation
- Good PostGIS integration

### Map Components Required
```typescript
// Core map component structure
interface MapVisualizationProps {
  precincts: PrecinctData[]
  responses: SurveyResponse[]
  selectedMetric: 'density' | 'turnout' | 'priorities'
  onPrecinctClick: (precinctId: string) => void
}

interface PrecinctData {
  id: string
  name: string
  geometry: GeoJSON.Polygon
  responseCount: number
  averageTurnoutScore: number
  topPriorities: string[]
  municipality: string
}
```

### Visualization Types
1. **Response Density Choropleth**
   - Color scale: Light blue (0 responses) → Dark blue (max responses)
   - Legend showing response count ranges
   - Municipality boundaries overlay

2. **Turnout Score Heat Map**
   - Color scale: Red (low turnout likelihood) → Green (high turnout)
   - Based on average responses to likelihood_vote question
   - Transparent overlay on base map

3. **Priority Issues Visualization**
   - Color-coded by most frequent community concern
   - Pie chart popups showing issue breakdown
   - Filter controls for specific issues

4. **Response Clustering**
   - Point clusters for individual survey locations
   - Cluster size indicates response volume
   - Zoom-based cluster aggregation

### PostGIS Integration
```typescript
// API endpoint for geographic data
GET /api/analytics/map-data
Response: {
  precincts: Array<{
    id: string
    name: string
    geometry: GeoJSON.Polygon
    metrics: {
      responseCount: number
      completionRate: number
      averageTurnoutScore: number
      topPriority: string
    }
  }>,
  responsePoints: Array<{
    lat: number
    lng: number
    precinctId: string
    timestamp: string
  }>
}
```

### Map Interaction Features
- **Zoom Controls**: Fit to Puerto Rico bounds initially
- **Layer Toggle**: Switch between visualization types
- **Precinct Selection**: Click to show detailed popup
- **Search**: Find precincts by name or municipality
- **Filter**: Filter by response date range, volunteer, etc.
- **Export**: Save map as PNG/PDF for reports

## Definition of Done
- [ ] Map component renders Puerto Rico with precinct boundaries
- [ ] Color-coded visualizations working for all metric types
- [ ] Interactive precinct popups showing detailed data
- [ ] Responsive layout works on mobile devices
- [ ] Spanish language labels and interface
- [ ] Real-time data updates via Supabase subscriptions
- [ ] Map performance optimized for 100+ precincts
- [ ] Export functionality saves high-quality images
- [ ] Loading states during data fetch
- [ ] Error handling for missing geographic data
- [ ] Unit tests for map components
- [ ] Integration tests for data visualization accuracy

### Mobile Optimization Requirements
- Touch-friendly controls (zoom, layer toggle)
- Readable popup text at mobile screen sizes
- Efficient rendering on mobile devices
- Simplified visualization for smaller screens
- Swipe gestures for map navigation

### Performance Requirements
- Initial map load: < 3 seconds
- Precinct data rendering: < 2 seconds
- Smooth zoom/pan interactions (60fps)
- Memory usage < 100MB on mobile
- Efficient re-rendering on data updates

## Spanish Language Requirements
Map interface text in Spanish:
- "Mapa de Respuestas" (Response Map)
- "Densidad de Respuestas" (Response Density)  
- "Probabilidad de Voto" (Voting Likelihood)
- "Prioridades Comunitarias" (Community Priorities)
- "Precintos" (Precincts)
- "Municipio" (Municipality)
- "Respuestas Totales" (Total Responses)
- "Exportar Mapa" (Export Map)

### Map Legend and Tooltips
```typescript
const spanishLabels = {
  responseCount: 'Número de Respuestas',
  turnoutScore: 'Puntuación de Participación',
  topPriority: 'Prioridad Principal',
  municipality: 'Municipio',
  completionRate: 'Tasa de Finalización',
  noData: 'Sin Datos Disponibles'
}
```

## Geographic Data Requirements
### Puerto Rico Precinct Boundaries
- Accurate precinct boundary polygons from PostGIS
- Municipality groupings
- Major landmark labels in Spanish
- Coordinate system: WGS84 (EPSG:4326)

### Base Map Styling
```javascript
// Mapbox custom style for Puerto Rico
const mapboxStyle = {
  version: 8,
  sources: {
    'puerto-rico': {
      type: 'vector',
      url: 'mapbox://styles/mapbox/light-v10'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#f8f9fa'
      }
    }
  ]
}
```

## Dependencies  
- Analytics queries and materialized views (Story 3.2)
- PostGIS precinct boundary data
- Mapbox account and API key (or Leaflet setup)
- Survey response data with geographic coordinates

## Blockers/Risks
- Large precinct polygon datasets may impact performance
- Mapbox API rate limits and costs
- Complex geographic calculations on frontend
- Mobile device memory constraints with map data

## Testing Checklist
- [ ] Map renders correctly with sample precinct data
- [ ] All visualization types display accurate data
- [ ] Precinct click interactions work properly
- [ ] Mobile responsive layout functions correctly
- [ ] Spanish text displays properly in all map elements
- [ ] Real-time data updates reflect on map
- [ ] Export functionality generates quality images
- [ ] Performance meets requirements on mobile devices
- [ ] Error handling works for network failures
- [ ] Map bounds stay within Puerto Rico region

## Component Architecture
```
/components/maps/
├── MapVisualization.tsx
├── PrecinctLayer.tsx
├── HeatMapOverlay.tsx
├── MapLegend.tsx
├── PrecinctPopup.tsx
├── MapControls.tsx
├── ExportButton.tsx
└── __tests__/
    ├── MapVisualization.test.tsx
    ├── PrecinctLayer.test.tsx
    └── MapLegend.test.tsx
```

## Map Configuration
```typescript
// Initial map configuration
const mapConfig = {
  center: [-66.1057, 18.4655], // San Juan, PR coordinates
  zoom: 8,
  minZoom: 7,
  maxZoom: 16,
  bounds: [
    [-67.9431, 17.8786], // Southwest corner
    [-65.2234, 18.5601]  // Northeast corner
  ]
}

// Color scales for visualizations
const colorScales = {
  responsesDensity: [
    '#f7fbff', '#deebf7', '#c6dbef', 
    '#9ecae1', '#6baed6', '#3182bd', '#08519c'
  ],
  turnoutScore: [
    '#d73027', '#f46d43', '#fdae61', 
    '#fee08b', '#d9ef8b', '#a6d96a', '#66bd63'
  ]
}
```

## Integration Points
### API Endpoints Needed
```typescript
// Get precinct geometries and metrics
GET /api/analytics/precinct-boundaries
Response: GeoJSON.FeatureCollection

// Get response location points  
GET /api/analytics/response-locations
Response: Array<{lat: number, lng: number, metadata: object}>

// Get real-time updates
WebSocket: /ws/map-updates
Messages: {type: 'new_response', precinct_id: string, metrics: object}
```

### Data Processing Pipeline
1. Fetch precinct boundaries from PostGIS
2. Aggregate response metrics by precinct
3. Calculate color mappings based on selected metric
4. Render map layers with appropriate styling
5. Set up real-time subscription for updates
6. Handle user interactions and state updates

## Accessibility Requirements
- Keyboard navigation support for map controls
- Screen reader compatible popup content
- High contrast mode for color-blind users
- Alt text for exported map images
- Focus indicators for interactive elements

## Resources
- Mapbox GL JS documentation
- React Leaflet documentation  
- PostGIS spatial data handling
- GeoJSON specification
- Puerto Rico geographic data sources
- Color theory for data visualization
- Mobile map interface best practices