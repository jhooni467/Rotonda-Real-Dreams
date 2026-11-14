import { BootScene } from './BootScene.js';
import { LevelScene } from './LevelScene.js';
import { MainMenuScene } from '../ui/screens/MainMenuScene.js';
import { SaveSlotsScene } from '../ui/screens/SaveSlotsScene.js';
import { ConfirmScene } from '../ui/screens/ConfirmScene.js';
import { PauseScene } from '../ui/screens/PauseScene.js';

/** Registra todas las escenas del juego. Una escena nueva = una línea aquí. */
export function registerScenes(sceneManager) {
  sceneManager.register('boot', BootScene);
  sceneManager.register('mainMenu', MainMenuScene);
  sceneManager.register('slots', SaveSlotsScene);
  sceneManager.register('confirm', ConfirmScene);
  sceneManager.register('pause', PauseScene);
  sceneManager.register('level', LevelScene);
}
