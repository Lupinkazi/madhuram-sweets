# Mobile Utility Bar Carousel - Quick Guide

## 🎯 What It Does

The utility bar now features an **elegant horizontal carousel** on mobile devices that automatically rotates through your contact information every 6 seconds.

## 📱 User Experience

### Auto-Rotation (Hands-free)
```
📞 Phone Number  →  (6 sec)  →  📧 Email  →  (6 sec)  →  🕐 Hours  →  (6 sec)  →  📞 Phone...
```

### Manual Control (User Interaction)

#### Touch Gestures
- **👉 Swipe Left** = Next item (phone → email → hours)
- **👈 Swipe Right** = Previous item (hours → email → phone)

#### Indicator Dots
- **● ━ ●** = Click any dot to jump directly to that info
- **Active dot** = Expands to pill shape (━) in orange
- **Inactive dots** = Small circles (●) in white

#### Desktop/Mouse
- **🖱️ Drag** = Works like swipe
- **🖱️ Hover** = Pauses auto-rotation
- **⌨️ Arrow Keys** = Navigate when focused

## 🎨 Visual Design

```
┌─────────────────────────────────────┐
│                                     │
│    📞 9768617279                    │  ← Current Item
│                                     │
│           ━  ○  ○                   │  ← Indicators
│         (1) (2) (3)                 │
└─────────────────────────────────────┘
```

**Legend:**
- **━** = Active (orange pill)
- **○** = Inactive (white dot)

## ⚙️ Smart Features

| Feature | Behavior |
|---------|----------|
| **Auto-pause** | Stops when you hover (desktop) |
| **Tab awareness** | Pauses when tab is hidden |
| **Reset timer** | 6-second countdown resets after any interaction |
| **Responsive** | Only active on screens < 768px wide |
| **Smooth animations** | 500ms cubic-bezier transitions |

## 🔧 Technical Details

### Files Involved
- **JS**: `js/utility-carousel.js` (carousel logic)
- **CSS**: `css/responsive.css` (styling for < 768px)
- **HTML**: All pages include the script

### Timing
- **Rotation**: 6000ms (6 seconds)
- **Animation**: 500ms slide transition
- **Swipe threshold**: 50px minimum

### Accessibility
- ✅ **Screen reader** support (ARIA labels)
- ✅ **Keyboard** navigation (arrow keys)
- ✅ **Focus** indicators (outline on dots)
- ✅ **Live regions** (announces changes)

## 🧪 Testing

### Mobile Devices
1. Open site on phone/tablet
2. Watch auto-rotation (6 sec intervals)
3. Try swiping left/right
4. Tap indicator dots
5. Verify all 3 items cycle properly

### Desktop Simulation
1. Open Chrome DevTools (F12)
2. Click "Toggle Device Toolbar" (Ctrl+Shift+M)
3. Set width < 768px (e.g., iPhone 12)
4. Test all interactions

### Quick Test Checklist
- [ ] Auto-rotates every 6 seconds
- [ ] Swipe left goes to next
- [ ] Swipe right goes to previous
- [ ] Dots change active state
- [ ] Clicking dot jumps to that item
- [ ] Hover pauses rotation (desktop)
- [ ] Carousel disables on desktop view

## 🎉 Benefits

| Before | After |
|--------|-------|
| Vertical stack (6-8rem tall) | Compact carousel (3rem) |
| All items always visible | One elegant item at a time |
| Static, boring | Interactive & animated |
| Takes too much space | Minimal footprint |
| No user control | Full manual control |

## 🚀 Live Now!

The carousel is **active on all pages** for mobile devices:
- ✅ Home (index.html)
- ✅ About (about.html)
- ✅ Contact (contact.html)
- ✅ Gallery (gallery.html)
- ✅ Order (order.html)
- ✅ Products (products.html)
- ✅ Quality (quality.html)

## 💡 Tips

1. **First Load**: Watch the auto-rotation for 18 seconds to see all 3 items
2. **Quick Access**: Use indicator dots to jump directly to email or hours
3. **Browse & Pause**: The carousel pauses when you swipe, so take your time
4. **Keyboard Users**: Tab to indicators, then use arrow keys to navigate

---

**Commit**: `16ba7f9`  
**Status**: ✅ Live on GitHub (main branch)  
**Deployment**: Will reflect once your hosting provider pulls latest changes
