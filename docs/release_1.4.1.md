## 1.4.1 Changelog [Jan 12 , 2024]

### New Features:

- Created new user role - owner; this user can assign global validations
- Integrated new global (root) T-based validations that are applied to every entity in the database
- Made statement entities dropable into a territory in the territory tree box
- Added basic search functionality in the annotator
- Added new detail section listing all document anchors of the selected entity

### Bug Fixes and Improvements:

- Improved box resizing and render performance
- Refactored user table considering the new owner role
- New owner modal for handling global validations
- Fixed ENTER, END, DEL, arrows, SHIFT, CTRL, CTRL+a, CTRL+x keys in annotator
- Improved annotator menu interactivity
- Added label language and status condition to T-based validations (#2366)
- Added search filter: invalid (#2396)
- Fixed some dark theme annotator colors
- Added copy-to-clipboard action to the annotator menu (#2492)
- Made possible to clear the selected entity classes to highlight in annotator
- Fixed displaying undefined entity in tag

### Code Refactor and system changes:

- Added new database collection for storing global settings
- Fixed incorrect status in stored entities
- Refactored keys handling in annotator
- Improved deploy scripts for minor developments
