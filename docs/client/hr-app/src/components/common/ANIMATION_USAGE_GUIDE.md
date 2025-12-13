# Animation Components Usage Guide

This guide shows how to add animations to any page in the application without using jQuery.

## Available Components

### 1. PageTransition

Wraps entire pages with fade and slide animations.

```jsx
import { PageTransition } from "../../components/common";

function MyPage() {
  return (
    <PageTransition direction="up" timeout={600}>
      <div>{/* Your page content */}</div>
    </PageTransition>
  );
}
```

**Props:**

- `direction`: 'up' | 'down' | 'left' | 'right' (default: 'up')
- `timeout`: animation duration in ms (default: 600)
- `delay`: delay before animation starts in ms (default: 0)

---

### 2. AnimatedCard

Adds entrance and hover animations to cards.

```jsx
import { AnimatedCard } from "../../components/common";
import { Card, CardContent } from "@mui/material";

function MyComponent() {
  return (
    <AnimatedCard delay={200}>
      <Card>
        <CardContent>Your content here</CardContent>
      </Card>
    </AnimatedCard>
  );
}
```

**Props:**

- `delay`: delay before animation starts in ms (default: 0)
- `timeout`: animation duration in ms (default: 800)
- `hoverEffect`: enable/disable hover effect (default: true)

---

### 3. AnimatedList

Adds staggered animations to list items.

```jsx
import { AnimatedList } from "../../components/common";
import { List, ListItem } from "@mui/material";

function MyList() {
  const items = ["Item 1", "Item 2", "Item 3"];

  return (
    <List>
      <AnimatedList staggerDelay={100}>
        {items.map((item, index) => (
          <ListItem key={index}>{item}</ListItem>
        ))}
      </AnimatedList>
    </List>
  );
}
```

**Props:**

- `staggerDelay`: delay between each item in ms (default: 100)
- `direction`: 'up' | 'down' | 'left' | 'right' (default: 'up')
- `timeout`: animation duration in ms (default: 500)

---

### 4. AnimatedButton

Adds click and hover animations to buttons.

```jsx
import { AnimatedButton } from "../../components/common";
import { Button } from "@mui/material";

function MyComponent() {
  return (
    <AnimatedButton>
      <Button variant="contained">Click Me</Button>
    </AnimatedButton>
  );
}
```

**Props:**

- `scaleOnHover`: scale factor on hover (default: 1.05)
- `scaleOnClick`: scale factor on click (default: 0.95)

---

## CSS Animation Classes

You can also use CSS classes directly:

```jsx
<div className="animate-fade-in">Fades in</div>
<div className="animate-slide-up animate-delay-200">Slides up with delay</div>
<div className="hover-lift">Lifts on hover</div>
```

**Available Classes:**

- `animate-fade-in`
- `animate-slide-up`
- `animate-slide-down`
- `animate-slide-left`
- `animate-slide-right`
- `animate-scale-in`
- `animate-pulse`
- `animate-bounce`
- `animate-shake`
- `animate-rotate`

**Delay Classes:**

- `animate-delay-100` through `animate-delay-500`

**Hover Effects:**

- `hover-lift` - lifts element on hover
- `hover-scale` - scales element on hover
- `hover-glow` - adds glow effect on hover

---

## Complete Page Example

```jsx
import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
} from "@mui/material";
import {
  PageTransition,
  AnimatedCard,
  AnimatedButton,
} from "../../components/common";

function ExamplePage() {
  const cards = [
    { title: "Card 1", content: "Content 1" },
    { title: "Card 2", content: "Content 2" },
    { title: "Card 3", content: "Content 3" },
  ];

  return (
    <PageTransition>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" className="animate-fade-in">
          My Animated Page
        </Typography>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {cards.map((card, index) => (
            <Grid item xs={12} md={4} key={index}>
              <AnimatedCard delay={index * 100}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{card.title}</Typography>
                    <Typography>{card.content}</Typography>

                    <AnimatedButton>
                      <Button variant="contained" sx={{ mt: 2 }}>
                        Action
                      </Button>
                    </AnimatedButton>
                  </CardContent>
                </Card>
              </AnimatedCard>
            </Grid>
          ))}
        </Grid>
      </Box>
    </PageTransition>
  );
}

export default ExamplePage;
```

---

## Why Not jQuery?

1. **React Compatibility**: jQuery manipulates the DOM directly, which conflicts with React's virtual DOM
2. **Performance**: Material-UI animations use CSS transitions and are hardware-accelerated
3. **Bundle Size**: No need to add jQuery (~30KB) when we have better alternatives
4. **Maintainability**: React-based animations are easier to maintain and debug
5. **Modern Standards**: Uses modern CSS and React patterns

---

## Tips

1. **Don't overdo it**: Too many animations can be distracting
2. **Keep it consistent**: Use similar animation timings across the app
3. **Performance**: Animate transform and opacity properties for best performance
4. **Accessibility**: Respect user's motion preferences (prefers-reduced-motion)
5. **Stagger delays**: Use 100-200ms delays between items for smooth staggered effects
