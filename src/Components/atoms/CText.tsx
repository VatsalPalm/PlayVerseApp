import { StyleSheet, Text, TextProps } from 'react-native';
import React from 'react';
import { useTheme } from '@react-navigation/native';

const CText = (props: TextProps) => {
    const { colors } = useTheme();
    return (
        <Text
            {...props}
            style={[{ color: colors.text }, props.style]}
            allowFontScaling={false}>
            {props.children}
        </Text>
    );
};
export default CText;
