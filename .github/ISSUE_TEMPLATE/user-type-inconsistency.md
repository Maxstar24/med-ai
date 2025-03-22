---
name: User Type Inconsistency
about: Track issues with User type definitions and usage
title: 'Fix User type inconsistency across the application'
labels: 'bug, refactor'
assignees: ''
---

## Description
There are inconsistencies in how the User type is defined and used across the application. 
The Firebase User type does not contain properties like `name` and `profile` which are being accessed in components.

## Current Issues
1. `src/app/profile/page.tsx` tries to access `user.name` and `user.profile` properties which don't exist on Firebase User type
2. `src/app/dashboard/page.tsx` tried to access `user.displayName` which may not exist
3. There's a mix of Firebase Auth User type and custom User types from MongoDB

## Proposed Solution
1. Create a consistent interface for User that combines Firebase and custom properties
2. Update contexts to populate this unified User type
3. Ensure all components use the correct properties
4. Consider implementing proper type guards and fallbacks 