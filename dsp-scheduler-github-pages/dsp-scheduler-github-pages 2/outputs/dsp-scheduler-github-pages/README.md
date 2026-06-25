# DSP Scheduler Command Center

Static GitHub Pages-ready app for DSP route scheduling, Cortex associate imports, and hiring capacity planning.

## Deploy With GitHub Pages

1. Create a new GitHub repository, for example `dsp-scheduler-command-center`.
2. Upload these files to the repository root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `.nojekyll`
3. In GitHub, open **Settings > Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Save. GitHub will publish the app at:

```text
https://YOUR-USERNAME.github.io/dsp-scheduler-command-center/
```

## Cortex Import Format

The Associate import accepts Cortex `AssociateData` exports directly, including:

```csv
Name and ID,TransporterID,Position,Qualifications,ID expiration,Personal Phone Number,Work Phone Number,Email,Status
```

The route demand import accepts:

```csv
day,routes,step_van,edv,nursery
sun,36,5,8,2
mon,47,7,10,3
```

## Notes

- The app is client-side only.
- No passwords are stored.
- Imported data is saved in the browser's local storage for that device/browser.
- For production multi-user use, add a backend database and authentication.
