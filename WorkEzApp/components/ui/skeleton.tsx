import { cn } from "./utils";
import { View } from 'react-native';

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <View
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
