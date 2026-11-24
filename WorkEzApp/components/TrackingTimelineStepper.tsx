import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Clock, Car, Wrench, CheckCircle2 } from 'lucide-react-native';
import { useAppTheme } from '../contexts/ThemeContext';

export type ServiceStep = 'created' | 'proposals' | 'on_way' | 'in_progress' | 'completed';

interface TrackingTimelineStepperProps {
  currentStep: ServiceStep;
  hasProposals?: boolean;
}

export function TrackingTimelineStepper({ currentStep, hasProposals = false }: TrackingTimelineStepperProps) {
  const { colors, isDark } = useAppTheme();

  const steps: { key: ServiceStep; label: string; icon: any }[] = [
    { key: 'created', label: 'Criado', icon: Check },
    { key: 'proposals', label: hasProposals ? 'Propostas' : 'Aguardando', icon: Clock },
    { key: 'on_way', label: 'A Caminho', icon: Car },
    { key: 'in_progress', label: 'Execução', icon: Wrench },
    { key: 'completed', label: 'Concluído', icon: CheckCircle2 },
  ];

  const stepOrder: Record<ServiceStep, number> = {
    created: 1,
    proposals: 2,
    on_way: 3,
    in_progress: 4,
    completed: 5,
  };

  const currentIndex = stepOrder[currentStep] || 1;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#FFFFFF', borderColor: colors.border }]}>
      <View style={styles.stepperRow}>
        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentIndex;
          const isCurrent = stepNum === currentIndex;
          const IconComponent = step.icon;

          return (
            <React.Fragment key={step.key}>
              {/* Círculo do Passo */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isDone && { backgroundColor: isDark ? '#059669' : '#10B981', borderColor: isDark ? '#059669' : '#10B981' },
                    isCurrent && { backgroundColor: '#2563EB', borderColor: '#3B82F6' },
                    !isDone && !isCurrent && { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: colors.border },
                  ]}
                >
                  <IconComponent
                    size={13}
                    color={isDone || isCurrent ? '#FFFFFF' : (isDark ? '#64748B' : '#94A3B8')}
                    strokeWidth={isDone || isCurrent ? 2.5 : 2}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    {
                      color: isCurrent
                        ? (isDark ? '#60A5FA' : '#2563EB')
                        : isDone
                        ? (isDark ? '#34D399' : '#059669')
                        : (isDark ? '#64748B' : '#94A3B8'),
                      fontWeight: isCurrent ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>
              </View>

              {/* Linha conectora entre círculos */}
              {idx < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: stepNum < currentIndex
                        ? (isDark ? '#059669' : '#10B981')
                        : (isDark ? '#334155' : '#E2E8F0'),
                    },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    width: 58,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  connector: {
    flex: 1,
    height: 3,
    marginBottom: 18,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});
