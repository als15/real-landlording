# Ant Design Deprecation Fixes

This document tracks Ant Design v5 deprecation warnings and their fixes. Keep this updated when encountering new deprecations.

---

## Steps Component

### `description` -> `subTitle`

**Deprecated:**
```tsx
const steps = [
  { title: 'Step 1', description: 'Description here' },
];
```

**Fix:**
```tsx
const steps = [
  { title: 'Step 1', subTitle: 'Description here' },
];
```

**Files affected:**
- `src/components/forms/MultiStepServiceRequestForm.tsx`

---

## Space Component

### `direction` -> `orientation`

**Deprecated:**
```tsx
<Space direction="vertical" size={10}>
```

**Fix:**
```tsx
<Space orientation="vertical" size={10}>
```

**Files affected:**
- `src/components/layout/PublicFooter.tsx`

---

### `split` -> `separator`

**Deprecated:**
```tsx
<Space split={<Divider type="vertical" />}>
```

**Fix:**
```tsx
<Space separator={<Divider type="vertical" />}>
```

**Files affected:**
- `src/components/layout/PublicFooter.tsx`

---

## How to Check for Deprecations

Run the development server and check the browser console for warnings like:
```
Warning: [antd: ComponentName] `oldProp` is deprecated. Please use `newProp` instead.
```

## Reference

- [Ant Design Migration Guide](https://ant.design/docs/react/migration-v5)
- [Ant Design Changelog](https://ant.design/changelog)
