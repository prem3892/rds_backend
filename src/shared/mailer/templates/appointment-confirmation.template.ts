export const appointmentConfirmationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #059669;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background-color: #f9fafb;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .button {
            display: inline-block;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 5px;
        }
        .button-primary {
            background-color: #059669;
        }
        .button-secondary {
            background-color: #6b7280;
        }
        .appointment-details {
            background-color: #ecfdf5;
            border: 1px solid #10b981;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #6b7280;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #d1fae5;
        }
        .detail-label {
            font-weight: bold;
            color: #065f46;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📅 Appointment Confirmed</h1>
    </div>
    <div class="content">
        <h2>Hello {{customerName}},</h2>
        
        <p>Your appointment has been successfully scheduled! We're looking forward to meeting with you.</p>
        
        <div class="appointment-details">
            <h3>📋 Appointment Details</h3>
            <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span>{{appointmentDate}}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span>{{appointmentTime}}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Agent:</span>
                <span>{{agentName}}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Department:</span>
                <span>{{department}}</span>
            </div>
            {{#if notes}}
            <div class="detail-row">
                <span class="detail-label">Notes:</span>
                <span>{{notes}}</span>
            </div>
            {{/if}}
        </div>
        
        <p><strong>What to expect:</strong></p>
        <ul>
            <li>Please be available 5 minutes before your scheduled time</li>
            <li>You'll receive a reminder 24 hours before your appointment</li>
            <li>Have any relevant documents or questions ready</li>
            <li>The session will be conducted via our secure chat platform</li>
        </ul>
        
        {{#if rescheduleLink}}
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{rescheduleLink}}" class="button button-primary">Reschedule Appointment</a>
            {{#if cancelLink}}
            <a href="{{cancelLink}}" class="button button-secondary">Cancel Appointment</a>
            {{/if}}
        </div>
        {{/if}}
        
        <p>If you need to make any changes or have questions about your appointment, please don't hesitate to contact us.</p>
        
        <div class="footer">
            <p><strong>Important:</strong> Please save this email for your records.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
`;
