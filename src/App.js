import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createDefaultKit } from './model';
import DrumEditorScreen from './screens/DrumEditorScreen';
import KitEditorScreen from './screens/KitEditorScreen';
import KitListScreen from './screens/KitListScreen';
import TunerScreen from './screens/TunerScreen';
import { loadKits, persistKits } from './storage';
import { colors } from './theme';

export default function App() {
  const [kits, setKits] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState({ name: 'list' });
  const [saved, setSaved] = useState(true);

  // загрузка сохранённых установок при старте
  useEffect(() => {
    loadKits().then((k) => {
      setKits(k);
      setLoaded(true);
    });
  }, []);

  // автосохранение при любом изменении (в фоне, без ожидания от пользователя)
  useEffect(() => {
    if (loaded) persistKits(kits);
  }, [kits, loaded]);

  const currentKit = screen.kitId ? kits.find((k) => k.id === screen.kitId) : null;
  const currentDrum = currentKit && screen.drumId ? currentKit.drums.find((d) => d.id === screen.drumId) : null;

  const updateKit = useCallback((nextKit) => {
    setKits((prev) => prev.map((k) => (k.id === nextKit.id ? nextKit : k)));
    setSaved(false);
  }, []);

  function updateDrum(nextDrum) {
    updateKit({
      ...currentKit,
      drums: currentKit.drums.map((d) => (d.id === nextDrum.id ? nextDrum : d)),
    });
  }

  function createKit() {
    const kit = createDefaultKit();
    setKits((prev) => [...prev, kit]);
    setScreen({ name: 'kitEditor', kitId: kit.id });
    setSaved(true);
  }

  async function saveKit() {
    const ok = await persistKits(kits);
    setSaved(ok);
  }

  if (!loaded) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.stage }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.stage }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.stage} />

        {screen.name === 'list' && (
          <KitListScreen kits={kits} onOpenKit={(kitId) => setScreen({ name: 'kitEditor', kitId })} onCreateKit={createKit} />
        )}

        {screen.name === 'kitEditor' && currentKit && (
          <KitEditorScreen
            kit={currentKit}
            onChangeKit={updateKit}
            onOpenDrum={(drumId) => setScreen({ name: 'drumEditor', kitId: currentKit.id, drumId })}
            onBack={() => setScreen({ name: 'list' })}
            onSave={saveKit}
            saved={saved}
          />
        )}

        {screen.name === 'drumEditor' && currentKit && currentDrum && (
          <DrumEditorScreen
            drum={currentDrum}
            onChange={updateDrum}
            onOpenTuner={(headKey) => setScreen({ name: 'tuner', kitId: currentKit.id, drumId: currentDrum.id, head: headKey })}
            onBack={() => setScreen({ name: 'kitEditor', kitId: currentKit.id })}
          />
        )}

        {screen.name === 'tuner' && currentKit && currentDrum && (
          <TunerScreen
            drum={currentDrum}
            headKey={screen.head}
            onChangeHead={(nextHead) =>
              updateDrum({ ...currentDrum, heads: { ...currentDrum.heads, [screen.head]: nextHead } })
            }
            onBack={() => setScreen({ name: 'drumEditor', kitId: currentKit.id, drumId: currentDrum.id })}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
