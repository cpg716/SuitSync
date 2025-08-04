import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CheckCircle } from 'lucide-react';

export default function RescheduleSuccess() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Appointment Rescheduled Successfully!
          </CardTitle>
          <p className="text-gray-600">
            Your appointment has been updated and you will receive a confirmation email shortly.
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-green-800 mb-2">What happens next?</h3>
            <ul className="text-sm text-green-700 space-y-1 text-left">
              <li>• You'll receive a confirmation email with your new appointment details</li>
              <li>• Our staff has been notified of the change</li>
              <li>• Please arrive 10 minutes before your scheduled time</li>
              <li>• If you need to make any other changes, please contact us directly</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = 'https://www.riversidemens.com'}
              className="w-full"
            >
              Return to Website
            </Button>
            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
            >
              Close This Window
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 