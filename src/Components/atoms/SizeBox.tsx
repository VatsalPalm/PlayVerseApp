import { View } from 'react-native';
import React from 'react';

interface SizedBoxProps {
    height?: number;
    width?: number;
    expand?: boolean;
    expandProportion?: number;
    color?: string;
}
const SizedBox = (props: SizedBoxProps) => {
    return (
        <View
            style={{
                height: props.height,
                width: props.width,
                flex: props.expand ? (props.expandProportion ?? 1) : undefined,
                backgroundColor: props.color,
            }}
        />
    );
};

export default SizedBox;
