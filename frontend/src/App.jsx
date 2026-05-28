import { useState } from 'react';

import { Button } from "@/components/ui/button";

import { LoginForm } from "@/components/login-form"

import {

  InputOTP,

  InputOTPGroup,

  InputOTPSeparator,

  InputOTPSlot,

} from "@/components/ui/input-otp";

function App() {

  const [count, setCount] = useState(0);

  return (

     <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>

  );

}

export default App;