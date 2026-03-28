# 🏗️ Mobile UI Component Architecture

## Overview

The redesigned mobile home screen is built with **custom React Native components** designed for professional energy grid visualization.

---

## Component Structure

```
┌─────────────────────────────────────┐
│  HomeScreen (Main Container)        │
│  • State management                 │
│  • Data fetching                    │
│  • Refresh logic                    │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┬──────────┬──────────┬─────────────┐
      │             │          │          │             │
      ↓             ↓          ↓          ↓             ↓
   Header      Battery    Supply/     Renewable    System
   Section     Card       Demand      Section      Metrics
               (Custom)   (StatBox)   (Custom)     (Grid)
                          (Custom)
```

---

## 1. StatBox Component

### Purpose

Displays a single metric with icon, label, value, and unit in a card format.

### Props

```typescript
interface StatBoxProps {
  icon: string; // Material Community Icon name
  label: string; // "Supply" | "Demand"
  value: string | number; // The numeric value
  unit: string; // "MW" | "kWh" etc
  color?: string; // Color for icon and value
}
```

### Features

- Gradient background (Dark Grey → Medium Grey)
- Icon with custom color
- Value in large bold text
- Unit in smaller, secondary text
- Border and padding for visual separation

### Usage

```tsx
<StatBox
  icon="power-socket"
  label="Supply"
  value={gridData.supply_mw.toFixed(1)}
  unit="MW"
  color={COLORS.cyan}
/>
```

### Rendering

```
┌─────────────────────┐
│ 🔌 Supply          │  ← Icon + Label
│ 450.2 MW           │  ← Value + Unit
└─────────────────────┘
```

---

## 2. EnergyBar Component

### Purpose

Displays an animated horizontal progress bar with percentage label.

### Props

```typescript
interface EnergyBarProps {
  label: string; // "Storage Level" | "Renewable Mix"
  percentage: number; // 0-100
  color: string; // Bar fill color
}
```

### Features

- Header with label and percentage
- Animated width from 0% to final value
- Duration: 1200ms with cubic easing
- Gradient backgrounds (background & fill)
- Smooth deceleration animation

### Animation Details

```javascript
Animated.timing(animValue, {
  toValue: percentage,
  duration: 1200, // 1.2 seconds
  easing: Easing.out(Easing.cubic), // Smooth deceleration
  useNativeDriver: false,
}).start();
```

### Usage

```tsx
<EnergyBar
  label="Storage Level"
  percentage={gridData.battery_level_pct}
  color={COLORS.green}
/>
```

### Rendering

```
Storage Level              67.5%
████████████████░░░░░░░░░░░░░░░░
```

---

## 3. Header Section

### Components

- **Title**: "G-Balancer"
- **Subtitle**: "Energy Grid Control"
- **Status Badge**: Pulsing green "ONLINE" indicator
- **Timestamp**: Last updated time

### Features

- Gradient background (Dark Grey → Black)
- Responsive layout with flexbox
- Animated pulsing status badge
- Real-time timestamp updates

### Animation

```javascript
Animated.loop(
  Animated.sequence([
    // Fade in: opacity 0 → 1
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }),
    // Fade out: opacity 1 → 0
    Animated.timing(pulseAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }),
  ]),
).start();
```

### Rendering

```
┌──────────────────────────────────────┐
│ G-Balancer              🟢 ONLINE   │
│ Energy Grid Control                  │
│ Updated: 10:45:32                    │
└──────────────────────────────────────┘
```

---

## 4. Battery Card

### Custom Component combining multiple visual elements:

- **Circular Gauge**: Shows battery percentage
- **Info Boxes**: Capacity and Status
- **Progress Bar**: Animated fill

### Features

- Large circular percentage display
- Two info boxes with labels and values
- Animated progress bar below
- Gradient background with cyan accents

### Structure

```
┌────────────────────────────────────────┐
│ 🔋 Battery Storage    Battery Charging │
├────────────────────────────────────────┤
│ ┌──────────┐  ┌──────────┐           │
│ │  67.5%   │  │ Capacity │ Status   │
│ │          │  │ 100 MWh  │ Active   │
│ └──────────┘  └──────────┘           │
│ Storage Level               67.5%     │
│ ████████████████░░░░░░░░░░░░░░░░░░  │
└────────────────────────────────────────┘
```

---

## 5. Balance Card (Conditional)

### Dynamic Content

Changes appearance based on supply vs demand:

**Surplus Mode** (Supply ≥ Demand)

```
┌─────────────────────────────────────┐
│ ✓ Grid Surplus: 69.7 MW             │
│   [Green accent, check icon]        │
└─────────────────────────────────────┘
```

**Deficit Mode** (Demand > Supply)

```
┌─────────────────────────────────────┐
│ ✕ Grid Deficit: 45.3 MW             │
│   [Red accent, alert icon]          │
└─────────────────────────────────────┘
```

### Features

- Dynamic colors based on balance
- Icon changes with status
- Gradient background matches status
- Border color indicates status
- Clear difference amount display

---

## 6. Renewable Box (Solar/Wind)

### Two-Box Layout

```
┌──────────────┐  ┌──────────────┐
│ ☀️ Solar     │  │ 💨 Wind      │
│ 185.3 MW     │  │ 120.8 MW     │
└──────────────┘  └──────────────┘
```

### Features

- Icon at top (yellow sun, cyan wind)
- Value in large bold text
- Label below in smaller text
- Equal width in row layout
- Gradient background

---

## 7. Clean Energy Card

### Components

- **Title & Percentage**: "Clean Energy Ratio: 58%"
- **Emoji**: 🌱 for visual appeal
- **Animated Bar**: Shows renewable percentage

### Features

- Large percentage display in green
- Animated progress bar
- Emoji adds personality
- Gradient background

### Rendering

```
Clean Energy Ratio                  58%
████████████████░░░░░░░░░░░░░░░░░░
```

---

## 8. System Metrics Grid

### 2x2 Grid Layout

```
┌────────────────┬────────────────┐
│ Frequency      │ Voltage        │
│ 50.0 Hz        │ 230V           │
├────────────────┼────────────────┤
│ Efficiency     │ Active Nodes   │
│ 94.5%          │ 1,248          │
└────────────────┴────────────────┘
```

### Features

- Responsive grid (auto 2 columns)
- Each card has label and value
- Color-coded per metric type:
  - Frequency: GREEN
  - Voltage: CYAN
  - Efficiency: YELLOW
  - Nodes: GREEN

### Responsive

```javascript
// Automatically adjusts to screen width
metricCard.width = (width - 48) / 2; // padding adjustment
```

---

## Color System

### Color Constants

```typescript
const COLORS = {
  black: "#0B0B0B", // Main background
  darkGrey: "#1A1A1A", // Card backgrounds
  grey: "#2A2A2A", // Gradients
  lightGrey: "#3A3A3A", // Borders, labels
  green: "#00FF41", // Success, positive
  cyan: "#00F0FF", // Data, highlights
  white: "#FFFFFF", // Text
  red: "#FF4444", // Errors, alerts
  yellow: "#FFD700", // Warnings
};
```

### Color Assignment

```
Component          | Color Use
─────────────────────────────────
Header Background  | BLACK + DARK_GREY
Card Backgrounds   | DARK_GREY + GREY
Card Borders       | LIGHT_GREY
Primary Text       | WHITE
Secondary Text     | LIGHT_GREY
Icons (Success)    | GREEN (#00FF41)
Icons (Data)       | CYAN (#00F0FF)
Icons (Warning)    | YELLOW (#FFD700)
Icons (Error)      | RED (#FF4444)
```

---

## Animation System

### 1. Pulsing Status Badge

```javascript
// Repeating opacity animation
Animated.loop(
  Animated.sequence([
    Animated.timing(to: 1, duration: 1500),
    Animated.timing(to: 0, duration: 1500),
  ])
).start();
```

**Effect**: Status indicator continuously pulses, drawing attention

### 2. Energy Bar Fill

```javascript
// Smooth width expansion with easing
Animated.timing(animValue, {
  toValue: percentage,
  duration: 1200,
  easing: Easing.out(Easing.cubic), // Deceleration curve
  useNativeDriver: false,
}).start();
```

**Effect**: Progress bar smoothly expands to final width

---

## State Management

### HomeScreen State

```typescript
state = {
  gridData: GridStatus | null, // Data from backend
  loading: boolean, // Initial load
  refreshing: boolean, // Pull-to-refresh
  lastUpdate: string, // Timestamp
  pulseAnim: Animated.Value, // Status badge pulse
};
```

### Data Fetching Flow

```
fetchGridStatus()
  ↓
Call: GET /simulate
  ↓
Transform Response → GridStatus
  ↓
Calculate renewable_percentage
  ↓
setGridData() + setLastUpdate()
  ↓
Render with new data
  ↓
Auto-refresh every 30s OR manual pull-to-refresh
```

---

## Styling Approach

### LinearGradient Usage

```javascript
<LinearGradient
  colors={[COLORS.darkGrey, COLORS.grey]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.batteryCard}
>
  {/* Content */}
</LinearGradient>
```

**Benefits**:

- Adds depth to cards
- Professional appearance
- Subtle visual hierarchy
- Direction can vary (horizontal, diagonal, etc.)

### Border Styling

```javascript
{
  borderWidth: 1,
  borderColor: COLORS.grey,    // #2A2A2A
  borderRadius: 12,            // Modern rounded corners
}
```

**Effect**: Subtle borders define card edges without harshness

### Spacing System

```javascript
padding: 14-16,     // Inside cards
gap: 8-12,         // Between elements
margin: 0,         // ScrollView handles outer padding
borderRadius: 12-14 // Cards and bars
```

**Result**: Consistent, breathable spacing

---

## Typography Hierarchy

### Title

```javascript
fontSize: 24,
fontWeight: '700',
letterSpacing: 0.5,
color: COLORS.white
```

### Subtitle

```javascript
fontSize: 12,
letterSpacing: 0.3,
color: COLORS.lightGrey
```

### Values (Data)

```javascript
fontSize: 18-26,
fontWeight: '700',
color: COLORS.green  // or themed color
```

### Labels

```javascript
fontSize: 10-11,
fontWeight: '600',
color: COLORS.lightGrey
```

---

## Responsive Design

### Screen Width Handling

```javascript
const { width } = Dimensions.get("window");

// Used for dynamic sizing
metricCard.width = (width - 48) / 2;
```

### ScrollView

- Full screen height (flex: 1)
- Vertical scrolling for content overflow
- RefreshControl at top
- Safe area padding (from navigation)

### Layout Patterns

```
Row Layout:  flexDirection: 'row', gap: 10
Grid (2x2):  flexWrap: 'wrap', gap: 10
Column:      Default (flexDirection: 'column')
```

---

## Error & Loading States

### Loading State

```tsx
{
  loading && (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color={COLORS.green} />
      <Text style={styles.loaderText}>Initializing...</Text>
    </View>
  );
}
```

### Error State

```tsx
{
  !gridData && (
    <View style={styles.errorContainer}>
      <MaterialCommunityIcons
        name="alert-circle"
        size={48}
        color={COLORS.red}
      />
      <Text style={styles.errorTitle}>Connection Error</Text>
      <Text style={styles.errorMessage}>Unable to fetch grid data</Text>
    </View>
  );
}
```

### Refresh Control

```tsx
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={COLORS.green}
    />
  }
>
```

---

## Performance Considerations

### Animations

- Use `useNativeDriver: true` where possible (faster)
- Current setup uses `useNativeDriver: false` for width/height (unavoidable)
- Animations are GPU-accelerated where possible

### Rendering

- RefreshControl is efficient
- No unnecessary re-renders (state updates are minimal)
- Components are lightweight

### Data Updates

- 30-second auto-refresh interval (network-efficient)
- Manual pull-to-refresh available
- Error handling prevents infinite loops

---

## Customization Guide

### Change Colors

Edit at top of file:

```typescript
const COLORS = {
  green: "#00FF41", // Change this
  cyan: "#00F0FF", // And this
  // ...
};
```

### Change Animation Speed

```javascript
// Energy bars (default: 1200ms)
duration: 1200,

// Status badge (default: 1500ms per cycle)
duration: 1500,

// Auto-refresh (default: 30000ms = 30 seconds)
setInterval(fetchGridStatus, 30000);
```

### Add New Metrics

In System Metrics grid, add a new card:

```tsx
<LinearGradient ...>
  <Text style={styles.metricLabel}>New Metric</Text>
  <Text style={styles.metricValue}>Value</Text>
</LinearGradient>
```

### Change Layout

All sections use flexbox - adjust `gap`, `flex: 1`, or `flexDirection` as needed.

---

## Summary

The redesigned mobile UI consists of:

| Component         | Purpose                | Key Features                      |
| ----------------- | ---------------------- | --------------------------------- |
| StatBox           | Metric display         | Icon, label, value, unit          |
| EnergyBar         | Progress visualization | Animated width, percentage label  |
| Header            | App title & status     | Pulsing badge, timestamp          |
| Battery Card      | Battery visualization  | Gauge, info boxes, progress bar   |
| Balance Card      | Grid status            | Dynamic color/icon based on state |
| Renewable Boxes   | Solar/Wind display     | Icons, values, labels             |
| Clean Energy Card | Renewable percentage   | Large %, animated bar, emoji      |
| Metrics Grid      | System KPIs            | 2x2 grid of important metrics     |

**All components are**:

- ✅ Professional looking
- ✅ Smoothly animated
- ✅ Responsive to screen size
- ✅ Color-coded for clarity
- ✅ Connected to real backend data
