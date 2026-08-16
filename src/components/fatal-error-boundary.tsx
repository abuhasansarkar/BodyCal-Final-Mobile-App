import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { Sentry } from "@/lib/sentry";
import { Text, View } from "@/tw";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class FatalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View className="flex-1 justify-between px-6 py-8">
            <View className="flex-1 items-center justify-center gap-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2]">
                <AppIcon color="#DC2626" name="close" size={32} weight="semibold" />
              </View>

              <Text className="text-center text-2xl font-bold text-[#111111]">
                Something went wrong
              </Text>

              <Text className="max-w-[320px] text-center text-base leading-6 text-[#737373]">
                An unexpected error occurred. You can restart the app to continue tracking your nutrition.
              </Text>

              {__DEV__ && this.state.error ? (
                <View className="mt-4 max-h-40 w-full overflow-hidden rounded-xl bg-[#F5F5F5] p-3">
                  <Text className="font-mono text-xs text-[#DC2626]" selectable>
                    {this.state.error.toString()}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="w-full">
              <PrimaryButton
                icon="back"
                label="Restart App"
                onPress={this.handleRestart}
              />
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
});
