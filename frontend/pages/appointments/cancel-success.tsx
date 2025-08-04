import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { XCircle } from 'lucide-react';

export default function CancelSuccess() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Appointment Canceled Successfully
          </CardTitle>
          <p className="text-gray-600">
            Your appointment has been canceled and our staff has been notified.
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2">What happens next?</h3>
            <ul className="text-sm text-red-700 space-y-1 text-left">
              <li>• Your time slot has been made available to other customers</li>
              <li>• Our staff has been notified of the cancellation</li>
              <li>• If you need to book a new appointment, please contact us</li>
              <li>• We hope to see you again soon!</li>
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