import { PropsWithChildren, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
export const colors = {
  bg: "#111827",
  card: "#253246",
  blue: "#3478F6",
  text: "#F6F7FB",
  muted: "#A9B7CC",
  green: "#36ED89",
  border: "#344156",
  paper: "#F3F4F6",
  danger: "#FFB3AA",
};
export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 13,
    borderCurve: "continuous",
    padding: 18,
    gap: 12,
    boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
  },
  text: { color: colors.text, fontSize: 16 },
  muted: { color: colors.muted, fontSize: 14 },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  input: {
    color: colors.text,
    fontSize: 17,
    paddingVertical: 8,
    minHeight: 40,
  },
  section: { color: colors.text, fontSize: 18, fontWeight: "600" },
});
export function Screen({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: Math.max(30, insets.bottom + 18),
          gap: 20,
          maxWidth: 620,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}
export function Button({
  title,
  onPress,
  secondary,
  disabled,
  children,
}: PropsWithChildren<{
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: secondary ? colors.card : colors.blue,
        padding: 18,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        minHeight: 56,
      })}
    >
      {children}
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  numeric,
  secure,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  numeric?: boolean;
  secure?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [buffer, setBuffer] = useState(value);
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingTop: 10,
      }}
    >
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={focused ? buffer : value}
        onFocus={() => {
          setBuffer(value);
          setFocused(true);
        }}
        onBlur={() => setFocused(false)}
        onChangeText={(text) => {
          setBuffer(text);
          onChangeText(text);
        }}
        keyboardType={numeric ? "decimal-pad" : "default"}
        autoCapitalize="none"
        secureTextEntry={secure}
        style={styles.input}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <Text
      selectable
      accessibilityRole={error ? "alert" : undefined}
      style={{
        color: error ? colors.danger : colors.muted,
        fontSize: 14,
        lineHeight: 21,
      }}
    >
      {text}
    </Text>
  );
}
