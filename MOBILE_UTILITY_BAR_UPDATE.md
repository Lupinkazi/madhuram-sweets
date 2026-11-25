# Mobile Utility Bar - Horizontal Carousel Update

## Issue
The utility bar was taking too much vertical space on mobile devices when stacking items vertically, making it look unelegant and consuming valuable screen real estate.

## Solution Implemented

### Auto-Rotating Horizontal Carousel with Manual Swipe

A sleek horizontal carousel that automatically cycles through contact information every 6 seconds, with full manual control via touch swipes and indicator dots.

## Features

### 🎯 Auto-Rotation
- **6-second intervals** - Automatically cycles through phone, email, and hours
- **Smooth animations** - Elegant cubic-bezier easing for professional transitions
- **Smart pause** - Pauses on hover (desktop) and when page is hidden

### 👆 Manual Control
- **Swipe gestures** - Swipe left/right to navigate instantly
- **Touch & mouse support** - Works with both touch and mouse drag
- **Indicator dots** - Click any dot to jump to specific item
- **Keyboard navigation** - Arrow keys for accessibility

### ✨ User Experience
- **Compact design** - Only ~2rem height plus indicators
- **Visual feedback** - Active indicator expands into a pill shape
- **Hover effects** - Indicators respond to hover with scale animation
- **Grab cursor** - Visual cue that content is draggable
- **Smooth transitions** - 500ms cubic-bezier animation

### ♿ Accessibility
- **ARIA labels** - Screen reader friendly
- **Keyboard support** - Full keyboard navigation
- **Focus indicators** - Clear focus states for indicators
- **Live regions** - Updates announced to screen readers

## Technical Implementation

### Files Modified/Created

1. **`css/responsive.css`**
   - Added carousel container styles
   - Horizontal flexbox layout (100% per item)
   - Indicator dots styling with active state
   - Smooth transform transitions
   - Mobile-only (< 768px)

2. **`js/utility-carousel.js`** (NEW)
   - Auto-rotation logic (6s intervals)
   - Touch/swipe detection
   - Mouse drag support
   - Indicator click handlers
   - Keyboard navigation
   - Responsive behavior
   - Pause/resume controls

3. **All HTML pages**
   - Added `<script defer src="js/utility-carousel.js"></script>`
   - Works on: index, about, contact, gallery, order, products, quality

## How It Works

### Auto-Rotation
```
Phone Number → (6s) → Email → (6s) → Hours → (6s) → Phone Number...
```

### Manual Control
- **Swipe right** = Previous item
- **Swipe left** = Next item  
- **Click dot** = Jump to that item
- **Arrow keys** = Navigate (when focused)

### Smart Behavior
- Auto-rotation **resets** after manual interaction
- **Pauses** when you hover (desktop)
- **Pauses** when tab is inactive
- **Disables** automatically on desktop (≥ 768px)

## Visual Design

### Indicators
- **Inactive**: 6px circle, 40% opacity white
- **Active**: 20×6px pill, full orange-light color
- **Hover**: Scale 1.2×, 60% opacity
- **Spacing**: 0.5rem gap between dots

### Transitions
- **Slide**: 500ms cubic-bezier(0.4, 0, 0.2, 1)
- **Indicator**: 400ms cubic-bezier(0.4, 0, 0.2, 1)
- **Hover**: 300ms ease

### Layout
```
┌─────────────────────────────────┐
│   📞 9768617279                 │  ← Slide 1
│         ━ ○ ○                   │  ← Indicators
└─────────────────────────────────┘
```

## Browser Support
- ✅ Touch events (iOS, Android)
- ✅ Mouse events (desktop backup)
- ✅ Keyboard navigation
- ✅ Modern CSS transforms
- ✅ Responsive design
- ✅ Accessibility features

## Performance
- **Minimal JavaScript** - Runs only on mobile
- **CSS transitions** - Hardware accelerated
- **Event optimization** - Passive listeners where appropriate
- **Memory efficient** - Cleans up on resize to desktop

## Benefits Over Previous Implementation

| Previous (Vertical Stack) | New (Horizontal Carousel) |
|---------------------------|---------------------------|
| ~6-8rem vertical space    | ~3rem total height        |
| All items always visible  | One item at a time        |
| Cluttered appearance      | Clean, focused design     |
| No interactivity          | Full touch/swipe control  |
| Static content            | Animated transitions      |

## Testing Checklist

✅ Test on iPhone (Safari iOS)  
✅ Test on Android (Chrome Android)  
✅ Test touch swipe left/right  
✅ Test indicator dot clicks  
✅ Verify auto-rotation timing  
✅ Check pause on hover  
✅ Test keyboard navigation  
✅ Verify desktop disables carousel  
✅ Test window resize behavior  
✅ Check accessibility with screen reader

## Future Enhancements (Optional)

- Add swipe velocity for faster flicks
- Implement progress bar on active indicator
- Add haptic feedback on mobile
- Prefers-reduced-motion support

---

**Result**: A modern, elegant, space-efficient carousel that showcases all contact information while taking minimal vertical space on mobile devices! 📱✨
