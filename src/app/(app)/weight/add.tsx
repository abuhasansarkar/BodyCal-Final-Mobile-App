import React from "react";
import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "convex/react";
import { router } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { AuthField } from "@/screens/auth/auth-fields";
import { Text } from "@/tw";
import { hasBackendConfiguration } from "@/config/env";
import { enqueueOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";

function WeightForm({ save }: { save: (weight: number, note: string) => Promise<string> }) { const [weight, setWeight] = React.useState(""); const [note, setNote] = React.useState(""); const [message, setMessage] = React.useState<string | null>(null); const valid = Number(weight) >= 35 && Number(weight) <= 350; const submit = async () => { try { const result = await save(Number(weight), note.trim()); setMessage(result); if (result === "Saved") router.back(); } catch { setMessage("Could not save this weight. Try again."); } }; return <AppScreen><Text className="text-2xl font-bold text-app-text">Log weight</Text><AuthField label="Weight (kg)" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} /><AuthField label="Optional note" value={note} onChangeText={setNote} />{message ? <Text accessibilityLiveRegion="polite" className="text-app-muted">{message}</Text> : null}<PrimaryButton disabled={!valid} icon="weight" label="Save weight" onPress={() => void submit()} /></AppScreen>; }

function ConfiguredWeightForm() { const create = useMutation(api.weights.create); return <WeightForm save={async (weight, note) => { const payload = { normalizedKg: weight, displayValue: weight, displayUnit: "kg" as const, localDate: currentLocalDate(), timezone: currentTimezone(), note: note || undefined, clientRequestId: createClientRequestId() }; const network = await NetInfo.fetch(); if (!network.isConnected) { await enqueueOutbox({ id: payload.clientRequestId, kind: "weight.create", payload }); return "Saved offline. It will sync when you reconnect."; } await create(payload); return "Saved"; }} />; }

export default function AddWeightRoute() { return hasBackendConfiguration ? <ConfiguredWeightForm /> : <WeightForm save={async () => "Cloud saving becomes available after Convex is configured."} />; }
