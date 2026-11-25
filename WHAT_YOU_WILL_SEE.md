# What You'll See on Mobile - Visual Guide

## 📱 Mobile View (< 768px width)

### **Slide 1: Phone Number** (Auto-displayed for 6 seconds)
```
┌──────────────────────────────────────┐
│                                      │
│      📞  9768617279                  │
│                                      │
│            ━  ○  ○                   │
└──────────────────────────────────────┘
```
👆 **Swipe left** to see email

---

### **Slide 2: Email** (Auto-rotates after 6 seconds)
```
┌──────────────────────────────────────┐
│                                      │
│   ✉️  msweetssnacks@gmail.com        │
│                                      │
│            ○  ━  ○                   │
└──────────────────────────────────────┘
```
👆 **Swipe left** for hours, or **swipe right** back to phone

---

### **Slide 3: Opening Hours** (Auto-rotates after 6 seconds)
```
┌──────────────────────────────────────┐
│                                      │
│      🕐  Open daily · 9 am – 9 pm    │
│                                      │
│            ○  ○  ━                   │
└──────────────────────────────────────┘
```
👈 **Swipe right** to see email

---

## 🎬 Animation Flow

### Auto-Rotation (Every 6 seconds)
```
Phone Number  ➔  Email  ➔  Hours  ➔  Phone Number  ➔  ...
(wait 6s)      (wait 6s)   (wait 6s)   (loops forever)
```

### Manual Swipe
```
         ← Swipe Left →
Phone  ⇄  Email  ⇄  Hours
         → Swipe Right ←
```

---

## 🎯 Interactive Elements

### **Indicator Dots** (Bottom of utility bar)

#### When Phone is showing:
```
━  ○  ○
█        ← Active (orange pill, 24px wide)
  █  █   ← Inactive (white circles, 7px)
```

#### When Email is showing:
```
○  ━  ○
█        ← Inactive
   █     ← Active (orange pill)
      █  ← Inactive
```

#### When Hours is showing:
```
○  ○  ━
█  █     ← Inactive
      █  ← Active (orange pill)
```

---

## 👆 Touch Gestures

### **Swipe Left** (Next Item)
```
Phone  →→→  Email  →→→  Hours  →→→  Phone
      30px+       30px+       30px+
```

### **Swipe Right** (Previous Item)
```
Hours  ←←←  Email  ←←←  Phone  ←←←  Hours
      30px+       30px+       30px+
```

### **Quick Flick** (Any Direction)
```
Fast swipe → Instant navigation (even if < 30px)
```

### **Tap Indicator Dot**
```
Tap 1st dot → Jump to Phone
Tap 2nd dot → Jump to Email
Tap 3rd dot → Jump to Hours
```

---

## 💻 Desktop View (≥ 768px width)

### All Items Visible (Horizontal Layout)
```
┌────────────────────────────────────────────────────────────────────┐
│  Serving the Kathmandu Valley                                      │
│                                                                    │
│  📞 9768617279    ✉️ msweetssnacks@gmail.com    🕐 Open daily...  │
└────────────────────────────────────────────────────────────────────┘
```
✨ **No carousel** - All contact info displayed at once  
✨ **No indicators** - Everything is already visible

---

## 🎨 Color & Style

### **Background**: Dark green (#183D2B)
### **Text**: Light cream (90% opacity)
### **Icons**: Light cream
### **Active Indicator**: Orange (#FFB870)
### **Inactive Indicator**: White (40% opacity)

---

## ⏱️ Timing

| Event | Duration |
|-------|----------|
| Auto-rotation | 6 seconds per slide |
| Swipe animation | 500ms (0.5 seconds) |
| Hover pause | Pauses until mouse leaves |
| Manual swipe | Resets the 6-second timer |

---

## 📊 Slide Content Breakdown

### **Slide 1: Phone Number**
- **Icon**: Phone (☎️)
- **Text**: "9768617279"
- **Action**: Clickable - Opens phone dialer

### **Slide 2: Email**
- **Icon**: Envelope (✉️)
- **Text**: "msweetssnacks@gmail.com"
- **Action**: Clickable - Opens email client

### **Slide 3: Hours**
- **Icon**: Clock (🕐)
- **Text**: "Open daily · 9 am – 9 pm"
- **Action**: Not clickable - Display only

---

## 🧪 Testing Instructions

### On Your Phone:
1. Open the website
2. Look at the **top bar** (green background)
3. You should see **ONLY ONE** piece of information
4. See **three dots** at the bottom (━ ○ ○)
5. **Wait 6 seconds** - Should auto-change to next item
6. **Swipe left** - Should move to next item
7. **Swipe right** - Should move to previous item
8. **Tap a dot** - Should jump to that item

### Expected Behavior:
- ✅ Smooth slide animation (not jerky)
- ✅ One info item at a time (not all three)
- ✅ Dots change to show current slide
- ✅ Can swipe in both directions
- ✅ Auto-rotates every 6 seconds
- ✅ Page can still scroll vertically

### If Something's Wrong:
- **All items showing** → Cache issue, hard refresh (Ctrl+Shift+R)
- **No swiping** → Check if screen width > 768px (should be mobile)
- **No auto-rotate** → Tab might be in background
- **Jerky animation** → Old browser, try Chrome/Safari

---

## 📱 Screen Size Behavior

```
┌────────────────────────────────────────────┐
│  Screen Width  │  Behavior                 │
├────────────────┼───────────────────────────┤
│  < 768px       │  Carousel (1 item)        │
│  ≥ 768px       │  All items (desktop)      │
└────────────────────────────────────────────┘
```

---

## 🎉 Summary

**On Mobile**: You'll see a **clean, single item** that smoothly transitions every 6 seconds, with the ability to **swipe manually** for instant access to any contact info. Three elegant dots at the bottom show your position.

**On Desktop**: You'll see the **traditional layout** with all contact info visible at once, no carousel needed.

---

**Result**: Elegant, space-efficient, and user-friendly! 🌟
