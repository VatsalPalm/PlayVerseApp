import {
  DimensionValue,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
} from 'react-native';
import React, { useRef, useState } from 'react';
import { StyleArgs } from '../../utils/types';
import { isIos, LightTheme } from '../../utils/constants';
import CText from './CText';
import { SH, SW, textStyle } from '../../utils/helpers';
import CImage from './CImage';
import { Icons } from '../../assets';
import SizedBox from './SizeBox';
import { useTheme } from '@react-navigation/native';
import moment from 'moment';
import { Source } from 'react-native-fast-image';
import { useThemeContext } from '../../context/themeContext';
import useStyleArgs from '../../hooks';
import { CommanStyleHandler } from '../../utils/commanStyles';

interface CustomTextInputProps extends Omit<TextInputProps, 'onChange'> {
  disable?: boolean;
  optinallable?: boolean;
  width?: DimensionValue;
  label: string;
  isMobile?: boolean;
  onPressDropdown?: () => void;
  mobileValue?: string;
  isFromDetail?: boolean;
  truncateString?: string;
  onChangeTextValue?: (text: string) => void;
  showRightIcon?: boolean;
  rightIcon?: number | Source | undefined;
  secureTextEntry?: boolean;
  secureTextStyle?: StyleProp<TextStyle>;
  setShowSecureTextEntry?: React.Dispatch<React.SetStateAction<boolean>>;
  onPressRightIcon?: () => void;
  inputRef?: React.RefObject<TextInput>;
}

const CTextInput = (props: CustomTextInputProps) => {
  const styles = useStyleArgs(styleHandler);
  const [value, setValue] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(
    props.secureTextEntry,
  );
  const { colors } = useTheme() as unknown as typeof LightTheme;


  const { isDark } = useThemeContext();
  const commanStyle = useStyleArgs(CommanStyleHandler);




  const onChangeText = (text: string) => {
    if (typeof text === 'string') {
      let value = text;
      if (props.isFromDetail) {
        value = text.trim();
      } else {
        value = text.trimStart() || text.trimEnd();
      }

      setValue(value.replace(props.truncateString ?? '', ''));
      props.onChangeTextValue &&
        props.onChangeTextValue(value.replace(props.truncateString ?? '', ''));
    } else {
      setValue(moment(text).format('ll'));
      props.onChangeTextValue && props.onChangeTextValue(text);
    }
  };



  return (
    <>
      <Pressable disabled={props?.disable} style={{ width: props?.width }}>
        <View style={styles.container}>
          <View style={[commanStyle.rowFlex]}>
            <CText style={styles.textlabel}>{props?.label} </CText>
            {props.optinallable && (
              <CText style={styles.label}> ({'Optional'})</CText>
            )}
          </View>
          <SizedBox height={props?.multiline ? 4 : 7} />
          <View style={{ flexDirection: 'row' }}>
            <View style={styles.contentContainer}>

              <View
                style={[
                  { flex: 0.9, paddingHorizontal: SW * 0.026 },
                  isIos && { marginStart: SW * 0.013, paddingVertical: SH * 0.012 },
                ]}>
                <TextInput
                  {...props}
                  ref={props?.inputRef}
                  value={props.value ?? value}
                  onChangeText={onChangeText}
                  cursorColor={colors.white}
                  secureTextEntry={isPasswordVisible}
                  placeholderTextColor={styles.placeholder.color}
                  style={[
                    styles.textInput,
                    // props?.editable && { color: colors.whiteFifty },
                    props?.isMobile && !isIos && { marginTop: SH * 0.003 },
                    props?.secureTextStyle,
                  ]}
                />
              </View>


            </View>
          </View>
        </View>
      </Pressable>
    </>
  );
};

export default CTextInput;

const styleHandler = ({ dims, insets, theme: { colors } }: StyleArgs) =>
  StyleSheet.create({
    container: {
      marginHorizontal: dims.width * 0.043,
    },
    contentContainer: {
      flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1.5,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBackground
    },
    textlabel: {
      ...textStyle(14, '400', colors.textColor),
    },
    label: {
      ...textStyle(15, '700', colors.textColor),
    },
    customUnderline: {
      height: 1, // Thickness of the underline
      backgroundColor: '#313131',
      borderRadius: 10,
    },
    leftIconStyle: {
      width: dims.width * 0.043,
      aspectRatio: 1,
    },
    textcountry: {
      ...textStyle(16, '400', colors.white),
      overflow: 'hidden',
      marginLeft: dims.width * 0.025,
    },
    rightIconStyle: {
      width: dims.width * 0.056,
      aspectRatio: 1,
    },
    textInput: {
      ...textStyle(14, '500', colors.textColor),
    },
    whiteFiftyStyle: {
      color: colors.white,
    },
    placeholder: {
      color: colors.placeholderColor
    }
  });
