package com.hvn.game.wordle;

public class Word5 {
	@Override
	public String toString() {
		return "[" + alphabet[0] +"] [" + alphabet[1] +"] [" + alphabet[2] +"] [" + alphabet[3] +"] [" + alphabet[4] +"]" ;
	}

	char alphabet[];
	String string;
	
	Word5(String str) {
		if (str.length() != 5)
			throw new RuntimeException("Only 5 letter word please!");
		
		this.string = str.toUpperCase();
		alphabet = string.toCharArray();
	}
	
	boolean contains(char ch) {
		return string.indexOf(Character.toUpperCase(ch), 0) >= 0;
	}
	
	boolean containsAt(char ch, int index) {
		return alphabet[index] == Character.toUpperCase(ch);
	}

	public boolean uniqueAlphabet() {
		int indx = 0;
		for (char c : alphabet) {
			for (int i = indx+1; i < alphabet.length; i++) {
				if (c == alphabet[i])
					return false;
			}
			indx++;
		}
		
		return true;
	}

	public static Word5 makeWord(String feedback) {
		try {
			return new Word5(feedback);
		} catch (Exception e){
			return null;				
		}
	}
}

