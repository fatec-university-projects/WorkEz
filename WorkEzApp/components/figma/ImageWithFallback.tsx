import React, { useState } from 'react';
import { View, Image, StyleProp, ViewStyle, ImageStyle } from 'react-native';

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

export interface ImageWithFallbackProps {
  src?: string | { uri: string };
  source?: any;
  alt?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
  [key: string]: any;
}

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

  const { src, alt, style, className, source, ...rest } = props;

  const resolvedSource = source ?? (typeof src === 'string' ? { uri: src } : src);

  return didError ? (
    <View
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <View className="flex-row items-center justify-center w-full h-full">
        <Image
          source={{ uri: ERROR_IMG_SRC }}
          accessibilityLabel="Error loading image"
          {...rest}
        />
      </View>
    </View>
  ) : (
    <Image
      source={resolvedSource ?? { uri: ERROR_IMG_SRC }}
      accessibilityLabel={alt}
      className={className}
      style={style as StyleProp<ImageStyle>}
      {...rest}
      onError={handleError}
    />
  );
}
