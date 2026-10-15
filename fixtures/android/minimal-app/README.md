# Minimal Android consumer fixture

This application verifies that Android's build tools accept the complete
resource tree produced by IconKit's `android-app-icon` preset. The verification
script copies this fixture to a temporary directory, generates the icon files
under `app/src/main/res`, and runs `:app:processDebugResources`.

The project intentionally contains no activity or application code. Its
manifest references both generated launcher icon resources, which is enough to
exercise Android manifest merging, adaptive-icon XML linking, density resource
selection, and resource packaging.
