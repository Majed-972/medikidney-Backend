import { Injectable, NotFoundException } from '@nestjs/common';
import { DialysisSessionStatus, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/PrismaService';
import { DialysisSessionAccessService } from './dialysis-session-access.service';
import { formatDialysisTimeValue } from 'src/dialysis-sessions/dialysis-session-time.util';

@Injectable()
export class DialysisSessionInsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionAccess: DialysisSessionAccessService,
  ) {}

  async getPatientLastCompleteSession(
    requesterUserId: number,
    requesterRole: Role,
    patientId: number,
  ) {
    await this.sessionAccess.assertPatientOwnsPatient(
      requesterUserId,
      requesterRole,
      patientId,
    );

    const lastSession = await this.prisma.dialysisSession.findFirst({
      where: {
        patient_id: patientId,
        status: DialysisSessionStatus.COMPLETED,
      },
      include: {
        patient: {
          select: {
            patient_id: true,
            full_name: true,
            blood_type: true,
            allergies: true,
          },
        },
        nurse: {
          select: { nurse_id: true, full_name: true },
        },
        schedule: {
          select: {
            schedule_id: true,
            weekday: true,
            shift_number: true,
            machine_number: true,
          },
        },
      },
      orderBy: [{ date: 'desc' }, { start_time: 'desc' }],
    });

    if (!lastSession) {
      throw new NotFoundException(
        'No completed dialysis session was found for this patient.',
      );
    }

    const [vitalSigns, medications, dialysisSettings, symptoms] =
      await Promise.all([
        this.prisma.sessionVitalSigns.findMany({
          where: { session_id: lastSession.session_id },
          include: {
            nurse: { select: { nurse_id: true, full_name: true } },
          },
          orderBy: { recorded_at: 'asc' },
        }),
        this.prisma.sessionMedication.findMany({
          where: { session_id: lastSession.session_id },
          include: {
            nurse: { select: { nurse_id: true, full_name: true } },
          },
          orderBy: { administered_at: 'asc' },
        }),
        this.prisma.sessionDialysisSettings.findMany({
          where: { session_id: lastSession.session_id },
          include: {
            nurse: { select: { nurse_id: true, full_name: true } },
          },
          orderBy: { recorded_at: 'asc' },
        }),
        this.prisma.sessionSymptom.findMany({
          where: { session_id: lastSession.session_id },
          orderBy: { occurred_at: 'asc' },
        }),
      ]);

    return {
      session: {
        session_id: lastSession.session_id,
        date: lastSession.date,
        start_time: formatDialysisTimeValue(lastSession.start_time),
        end_time: formatDialysisTimeValue(lastSession.end_time),
        weight_before: lastSession.weight_before,
        weight_after: lastSession.weight_after,
        fluid_removed: lastSession.fluid_removed,
        blood_pressure_before: lastSession.blood_pressure_before,
        blood_pressure_after: lastSession.blood_pressure_after,
        notes: lastSession.notes,
        status: lastSession.status,
        createdAt: lastSession.created_at,
        updatedAt: lastSession.updated_at,
      },
      patient: lastSession.patient,
      nurse: lastSession.nurse,
      schedule: lastSession.schedule,
      vitalSigns,
      medications,
      dialysisSettings,
      symptoms: {
        total: symptoms.length,
        breakdown: this.buildSymptomsStatistics(symptoms),
        details: symptoms,
      },
    };
  }

  async getSessionTimeline(
    requesterUserId: number,
    requesterRole: Role,
    sessionId: number,
  ) {
    const session = await this.sessionAccess.getReadableSession(
      requesterUserId,
      requesterRole,
      sessionId,
    );

    const [vitalSigns, medications, dialysisSettings, symptoms] =
      await Promise.all([
        this.prisma.sessionVitalSigns.findMany({
          where: { session_id: sessionId },
          include: { nurse: { select: { full_name: true } } },
        }),
        this.prisma.sessionMedication.findMany({
          where: { session_id: sessionId },
          include: { nurse: { select: { full_name: true } } },
        }),
        this.prisma.sessionDialysisSettings.findMany({
          where: { session_id: sessionId },
          include: { nurse: { select: { full_name: true } } },
        }),
        this.prisma.sessionSymptom.findMany({
          where: { session_id: sessionId },
        }),
      ]);

    const events = [
      ...vitalSigns.map((vitalSign) => ({
        type: 'vital_signs' as const,
        timestamp: vitalSign.recorded_at,
        eventId: vitalSign.vital_id,
        description: `Blood pressure: ${vitalSign.systolic ?? '--'}/${vitalSign.diastolic ?? '--'} | Pulse: ${vitalSign.pulse ?? '--'} | Temperature: ${vitalSign.temperature ?? '--'}°C | O2: ${vitalSign.oxygen_saturation ?? '--'}%`,
        recordedBy: vitalSign.nurse?.full_name,
        details: {
          systolic: vitalSign.systolic,
          diastolic: vitalSign.diastolic,
          pulse: vitalSign.pulse,
          temperature: vitalSign.temperature,
          oxygenSaturation: vitalSign.oxygen_saturation,
        },
      })),
      ...medications.map((medication) => ({
        type: 'medication' as const,
        timestamp: medication.administered_at,
        eventId: medication.med_id,
        description: `${medication.medication_name}: ${medication.dosage} ${medication.unit}`,
        recordedBy: medication.nurse?.full_name,
        details: {
          medicationName: medication.medication_name,
          dosage: medication.dosage,
          unit: medication.unit,
          notes: medication.notes,
        },
      })),
      ...dialysisSettings.map((setting) => ({
        type: 'dialysis_settings' as const,
        timestamp: setting.recorded_at,
        eventId: setting.setting_id,
        description: `Device Settings | Blood flow: ${setting.blood_flow_rate ?? '--'} ml/min | Liquid flow: ${setting.dialysate_flow ?? '--'} ml/min | Filtration: ${setting.ultrafiltration_rate ?? '--'}`,
        recordedBy: setting.nurse?.full_name,
        details: {
          bloodFlowRate: setting.blood_flow_rate,
          dialysateFlow: setting.dialysate_flow,
          ultrafiltrationRate: setting.ultrafiltration_rate,
        },
      })),
      ...symptoms.map((symptom) => ({
        type: 'symptom' as const,
        timestamp: symptom.occurred_at,
        eventId: symptom.symptom_id,
        description: `Viewer: ${symptom.symptom_type} - ${symptom.severity}`,
        recordedBy: undefined,
        details: {
          symptomType: symptom.symptom_type,
          severity: symptom.severity,
          notes: symptom.notes,
        },
      })),
    ].sort(
      (firstEvent, secondEvent) =>
        new Date(firstEvent.timestamp).getTime() -
        new Date(secondEvent.timestamp).getTime(),
    );

    return {
      sessionId: session.session_id,
      patientId: session.patient_id,
      sessionStartTime: formatDialysisTimeValue(session.start_time),
      sessionEndTime: formatDialysisTimeValue(session.end_time),
      totalEvents: events.length,
      events,
    };
  }

  private buildSymptomsStatistics(
    symptoms: Array<{ symptom_type: string; severity: string }>,
  ): Record<string, Record<string, number>> {
    return symptoms.reduce<Record<string, Record<string, number>>>(
      (statistics, symptom) => {
        if (!statistics[symptom.symptom_type]) {
          statistics[symptom.symptom_type] = {};
        }

        statistics[symptom.symptom_type][symptom.severity] =
          (statistics[symptom.symptom_type][symptom.severity] ?? 0) + 1;

        return statistics;
      },
      {},
    );
  }
}
