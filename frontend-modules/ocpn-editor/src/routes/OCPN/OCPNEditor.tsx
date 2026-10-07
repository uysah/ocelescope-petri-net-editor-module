import "@r4pm/components/styles.css";
import type { ObjectCentricPetriNet } from "@r4pm/components";
import { Box, Button, Stack, Text, Splitter, ScrollArea, Group, Card, TextInput, NumberInput, SegmentedControl, Select, Autocomplete } from "@mantine/core";
import { DownloadIcon, PlayIcon, Upload } from "lucide-react";
import { lazy, useEffect, useState } from "react";
import type { UseSplitterReturnValue } from "@mantine/hooks";
import { addPlace, addTransition, addArc} from "../../util/OCPN/editor_functions";
import { useRef, useCallback } from "react";
import { EditorMode } from "../main";
import { useExportOCPN, useImportOCPN } from "../../api/ocpnEditor";
import { downloadFile } from "../../util/Petri Net/export_pnml";


const OcpnEditorPanel = lazy(() => import("./OcpnEditorPanel"));

const emptyNet: ObjectCentricPetriNet = {
  petri_net: { places: [], transitions: [], arcs: [], initial_marking: null, final_marking: null },
  place_object_type: {},
  place_in_out_mult: {},
};

const Editor = (
  {
    mode,onModeChange
  }:{
    mode:EditorMode;
    onModeChange: (mode:EditorMode) => void;
  }
) => {


  const [mounted, setMounted] = useState(false);
  const [net, setNet] = useState<ObjectCentricPetriNet>(emptyNet);
  const [seedNet, setSeedNet] = useState<ObjectCentricPetriNet>(emptyNet);
  const [newPlaceObjectType, setNewPlaceObjectType] = useState("");
  const [newPlaceTokens, setNewPlaceTokens] = useState(0);
  const [newPlaceFinalTokens, setNewPlaceFinalTokens] = useState(0);
  const [remountKey, setRemountKey] = useState(0);
  const [newTransitionLabel, setNewTransitionLabel] = useState("New Transition");
  const [variableArcButton, setVariableArcButton] = useState(false);
  const [arcSource, setArcSource] = useState<string | null>(null);
  const [arcTarget, setArcTarget] = useState<string | null>(null);
  const [knownObjectTypes, setKnownObjectTypes] = useState<string[]>([]);


  const netUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitterRef = useRef<UseSplitterReturnValue>(null);

  const { mutateAsync: exportOcpn } = useExportOCPN();
  const { mutateAsync: importOcpn } = useImportOCPN();


  const handleDownload = async () => {
    const result = await exportOcpn({ data: net });
    const content = JSON.stringify(result, null, 2);
    downloadFile("ocpn.ocelescope", content, "application/json");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const importedOCPN = await importOcpn({ data: { file } });
    setSeedNet(importedOCPN as ObjectCentricPetriNet);
    setNet(importedOCPN as ObjectCentricPetriNet);
    setRemountKey((k) => k + 1);

    e.target.value = "";
  };


  const handleAddPlace = () => {
    if (!newPlaceObjectType) return;
    const updated = addPlace(net, newPlaceObjectType, newPlaceTokens, newPlaceFinalTokens);
    setSeedNet(updated);
    setRemountKey((k) => k + 1);
    setKnownObjectTypes((prev) =>
      prev.includes(newPlaceObjectType) ? prev : [...prev, newPlaceObjectType],
    );
    setNewPlaceTokens(0);
    setNewPlaceFinalTokens(0);
  };

  const handleAddTransition = () => {
    const updated = addTransition(net, newTransitionLabel)
    setSeedNet(updated);
    setRemountKey((k) => k + 1);
  }

  const handleAddArc = () => {
    if (!arcSource || !arcTarget) return;
    const updated = addArc(net, arcSource, arcTarget, variableArcButton);
    setSeedNet(updated);
    setRemountKey((k) => k + 1);
    setArcSource(null);
    setArcTarget(null);
  };

  const handleRunLayout = () => {
  setSeedNet(net);
  setRemountKey((k) => k + 1);
  };

  const handleNetChange = useCallback((updatedNet: ObjectCentricPetriNet) => {
    if (netUpdateTimer.current) clearTimeout(netUpdateTimer.current);
    netUpdateTimer.current = setTimeout(() => {
      setNet(updatedNet);
    }, 200);
  }, []);




  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const placeOptions = net.petri_net.places.map((p) => ({ value: p.id, label: p.id }));
  const transitionOptions = net.petri_net.transitions.map((t) => ({ value: t.id, label: t.label ?? t.id }));
  const sourceOptions = [
    { group: "Places", items: placeOptions },
    { group: "Transitions", items: transitionOptions },
  ];
  const sourceIsPlace = net.petri_net.places.some((p) => p.id === arcSource);
  const targetOptions = arcSource ? (sourceIsPlace ? transitionOptions : placeOptions) : [];
  const canAddArc = !!arcSource && !!arcTarget;

  return (
    <Splitter
      splitterRef={splitterRef}
      lineSize={4}
      handleColor="var(--mantine-color-default-border)"
      h={"100%"}
    >
      <Splitter.Pane defaultSize={75} min={"10%"} collapsible>
        <Stack gap={"sm"} p="xs" h="100%">
          <Group
            px="sm"
            py="xs"
            wrap="nowrap"
            justify="space-between"
            style={{ borderBottom: "2px solid var(--mantine-color-default-border)" }}
          >
            <Text fw={600} size="lg">
              Object-Centric Petri-Net Editor
            </Text>
            <Group>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ocelescope"
                style={{ display: "none" }}
                onChange={handleFileSelected}
              />
              <Button leftSection={<Upload size={16} />} variant="default" onClick={handleImportClick}>
                Upload OCPN
              </Button>
              <Button leftSection={<DownloadIcon size={16} />} variant="default" onClick={handleDownload}>
                Export OCPN
              </Button>
              <Button leftSection={<PlayIcon size={16}/>} onClick={handleRunLayout}>
                Run Layout
              </Button>
            </Group>
          </Group>
          <Box pos="relative" style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <OcpnEditorPanel key={remountKey} data={seedNet} onNetChange={handleNetChange} />
          </Box>
        </Stack>
      </Splitter.Pane>

      <Splitter.Pane defaultSize={25} min={"10%"} collapsible>
        <ScrollArea h="100%" type="auto">
          <Stack gap="sm" p="md">
            <Group
                px="sm"
                py="xs"
                wrap="nowrap"
                justify="space-between"
                style={{ borderBottom: "2px solid var(--mantine-color-default-border)" }}
              >
              <Text fw={600} size="lg">
                Toolbox
              </Text>
            </Group>
            <Text fw={600} size="md">
              Editor Type
            </Text>
            <SegmentedControl
                value={mode}
                onChange={(v) => onModeChange(v as EditorMode)}
                data={[
                  { label: "Object-Centric", value: "ocpn" },
                  { label: "Classic", value: "classic" }

                ]}
            />
            <Text fw={600} size="md">
              Add Elements
            </Text>
            <Card withBorder radius="sm" padding="sm">
              <Text fw={600} size="sm">
                New Place
              </Text>
              <Text size="xs" c="dimmed" mb="xs">
                Set the object type, initial, and final marking.
              </Text>
              <Autocomplete
                label="Object Type"
                mb="xs"
                value={newPlaceObjectType}
                onChange={setNewPlaceObjectType}
                data={knownObjectTypes}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPlace();
                  }
                }}
              />
              <NumberInput label="Initial Tokens" mb="xs" value={newPlaceTokens} onChange={(v) => setNewPlaceTokens(Number(v)|| 0)}/>
              <NumberInput label="Final Tokens" mb="xs" value={newPlaceFinalTokens} onChange={(v) => setNewPlaceFinalTokens(Number(v)|| 0)}/>
              <Button variant="default" disabled={!newPlaceObjectType} onClick={handleAddPlace}>
                Add Place
              </Button>
            </Card>
            <Card withBorder radius="sm" padding="sm">
                <Text fw={600} size="sm">
                  New Transition
                </Text>
                <Text size="xs" c="dimmed" mb="xs">
                  Set the transition label.
                </Text>
                <TextInput 
                  label="Transition Label" 
                  mb="xs" 
                  value={newTransitionLabel} 
                  onChange={(e) => setNewTransitionLabel(e.currentTarget.value)} 
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTransition();
                    }
                  }}
                />
                <Button variant="default" onClick={handleAddTransition}>
                  Add Transition
              </Button>
            </Card>
            <Card withBorder radius="sm" padding="sm">
                <Text fw={600} size="sm">
                  New Arc
                </Text>
                <Text size="xs" c="dimmed" mb="xs">
                  Select the source and target nodes.
                </Text>
                <SegmentedControl 
                  value={variableArcButton ? "variable" : "normal"} 
                  onChange={(v) => setVariableArcButton(v === "variable")} 
                  data={[
                    {label: "Normal", value: "normal"},
                    {label: "Variable", value: "variable"}
                  ]}/>            
                <Stack gap={"xs"} mb="xs">
                    <Select
                      label="From"
                      placeholder="Select source"
                      data={sourceOptions}
                      value={arcSource}
                      onChange={(value) => {
                        setArcSource(value);
                        setArcTarget(null);
                      }}
                      clearable
                      searchable
                    />
                    <Select
                      label="To"
                      placeholder="Select target"
                      data={targetOptions}
                      value={arcTarget}
                      onChange={setArcTarget}
                      disabled={!arcSource}
                      clearable
                      searchable
                    />
                </Stack>
                <Button variant="default" disabled={!canAddArc} onClick={handleAddArc}>
                  Add Arc
                </Button>
            </Card>
          </Stack>
        </ScrollArea>
      </Splitter.Pane>
    </Splitter>
  );
};

export default Editor;