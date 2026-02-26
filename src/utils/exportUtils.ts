// utils/exportUtils.ts
// Export utilities for PNG, PDF, and JSON

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type Konva from 'konva';
import type { ProjectState, Room, ComplianceReport } from '../types';
import { getRoomLabel, getComplianceStatus } from './vastuUtils';
import { getZoneLabel } from './zoneUtils';

/**
 * Export canvas as PNG image
 */
export async function exportPNG(
    stageRef: React.RefObject<Konva.Stage>,
    filename = 'vastu-plan.png'
): Promise<void> {
    if (!stageRef.current) {
        throw new Error('Stage reference not available');
    }

    const stage = stageRef.current;

    // Export at 2x scale for high resolution
    const dataURL = stage.toDataURL({
        pixelRatio: 2,
        mimeType: 'image/png',
    });

    // Download the image
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Export project as PDF with details
 */
export async function exportPDF(
    stageRef: React.RefObject<Konva.Stage>,
    projectState: ProjectState,
    compliance: ComplianceReport,
    filename = 'vastu-plan.pdf'
): Promise<void> {
    if (!stageRef.current) {
        throw new Error('Stage reference not available');
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();

    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = height - 50;

    // Title
    page.drawText('Vedic Vastu Planner - House Plan', {
        x: 50,
        y: yPosition,
        size: 20,
        font: fontBold,
        color: rgb(0.06, 0.38, 1),
    });

    yPosition -= 40;

    // Plot details
    page.drawText('Plot Details:', {
        x: 50,
        y: yPosition,
        size: 14,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    yPosition -= 20;

    page.drawText(`Width: ${projectState.plot.width.toFixed(1)} units`, {
        x: 70,
        y: yPosition,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
    });

    yPosition -= 18;

    page.drawText(`Height: ${projectState.plot.height.toFixed(1)} units`, {
        x: 70,
        y: yPosition,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
    });

    yPosition -= 18;

    page.drawText(`Orientation: ${projectState.plot.orientation}°`, {
        x: 70,
        y: yPosition,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
    });

    yPosition -= 18;

    page.drawText(`Vastu Mode: ${projectState.vastuMode.toUpperCase()}`, {
        x: 70,
        y: yPosition,
        size: 11,
        font,
        color: rgb(0.2, 0.2, 0.2),
    });

    yPosition -= 30;

    // Compliance score
    const complianceStatus = getComplianceStatus(compliance.totalScore);
    page.drawText('Vastu Compliance:', {
        x: 50,
        y: yPosition,
        size: 14,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    yPosition -= 20;

    page.drawText(`Overall Score: ${compliance.totalScore}% - ${complianceStatus.text}`, {
        x: 70,
        y: yPosition,
        size: 11,
        font,
        color: compliance.totalScore >= 70 ? rgb(0.06, 0.72, 0.51) : rgb(0.94, 0.27, 0.27),
    });

    yPosition -= 30;

    // Room list
    page.drawText('Room Details:', {
        x: 50,
        y: yPosition,
        size: 14,
        font: fontBold,
        color: rgb(0, 0, 0),
    });

    yPosition -= 20;

    for (const room of projectState.rooms) {
        if (yPosition < 100) {
            // Add new page if running out of space
            const newPage = pdfDoc.addPage([595, 842]);
            yPosition = height - 50;
        }

        const roomScore = compliance.roomScores.find((rs) => rs.id === room.id);
        const scoreText = roomScore ? `${roomScore.score}%` : 'N/A';
        const violationText = roomScore?.violation === 'forbidden' ? ' ⚠️ FORBIDDEN' : '';

        page.drawText(
            `• ${getRoomLabel(room.type)} - ${getZoneLabel(room.zone)} - ${room.width.toFixed(1)}×${room.height.toFixed(1)} - Score: ${scoreText}${violationText}`,
            {
                x: 70,
                y: yPosition,
                size: 10,
                font,
                color: roomScore?.violation === 'forbidden' ? rgb(0.94, 0.27, 0.27) : rgb(0.2, 0.2, 0.2),
            }
        );

        yPosition -= 18;
    }

    yPosition -= 20;

    // Embed canvas image
    try {
        const stage = stageRef.current;
        const dataURL = stage.toDataURL({
            pixelRatio: 2,
            mimeType: 'image/png',
        });

        // Convert data URL to bytes
        const imageBytes = await fetch(dataURL).then((res) => res.arrayBuffer());
        const image = await pdfDoc.embedPng(imageBytes);

        const imageDims = image.scale(0.5);
        const imageX = (width - imageDims.width) / 2;

        if (yPosition - imageDims.height < 50) {
            const newPage = pdfDoc.addPage([595, 842]);
            yPosition = height - 50;
        }

        page.drawImage(image, {
            x: imageX,
            y: yPosition - imageDims.height,
            width: imageDims.width,
            height: imageDims.height,
        });
    } catch (error) {
        console.error('Failed to embed canvas image:', error);
    }

    // Footer
    page.drawText('Generated by Vedic Vastu Planner', {
        x: 50,
        y: 30,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(new Date().toLocaleDateString(), {
        x: width - 150,
        y: 30,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * Export project as JSON
 */
export function exportJSON(projectState: ProjectState, filename = 'vastu-plan.json'): void {
    const json = JSON.stringify(projectState, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

/**
 * Import project from JSON
 */
export async function importJSON(file: File): Promise<ProjectState> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const projectState = JSON.parse(content) as ProjectState;

                // Validate structure
                if (!projectState.plot || !projectState.rooms || !projectState.vastuMode) {
                    throw new Error('Invalid project file structure');
                }

                resolve(projectState);
            } catch (error) {
                reject(new Error('Failed to parse JSON file'));
            }
        };

        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };

        reader.readAsText(file);
    });
}
