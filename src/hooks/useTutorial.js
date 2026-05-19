const STORAGE_KEY = 'orion.tutorial.dismissed';

function getState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export function useTutorial(screenKey) {
  const isDismissed = () => getState()[screenKey] === true;

  const dismiss = () => {
    const state = getState();
    state[screenKey] = true;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const reopen = () => {
    const state = getState();
    delete state[screenKey];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  return { isDismissed, dismiss, reopen };
}

export function resetAllTutorials() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getTutorialDismissedMap() {
  return getState();
}
