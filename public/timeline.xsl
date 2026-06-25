<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:math="http://www.w3.org/2005/xpath-functions/math"
    xmlns:xd="http://www.oxygenxml.com/ns/doc/xsl"
    xmlns:ash="http://ashluvzu.com"
    xmlns="http://www.w3.org/2000/svg"
    exclude-result-prefixes="xs math xd"
    version="3.0">
    
    <xsl:function name="ash:dateConverter">
        <xsl:param name="dateInfo"/>
        <xsl:value-of select="$dateInfo"/>
        
        
        <xsl:variable name="BCYears">
         <xsl:for-each select="$dateInfo[era='BC']">
             <xsl:value-of select="'-' || child::year ! number()"/>
         </xsl:for-each>
        </xsl:variable> 
        
      
             
        
        
    </xsl:function>
    <xsl:template match="/">

        <xsl:variable name="x-spacer" select="10"/>
        <svg width="25000" viewBox="0 0 25000 400">
            <xsl:variable name="allDates" as="element()+" select="//date"/>
            
        <xsl:variable name="BC-dates" as="item()+">
                <xsl:for-each select="$allDates[era='BC']">
                    <xsl:value-of select="current() ! '-' || child::year ! number()"/>
                </xsl:for-each>
        </xsl:variable>
            
            <xsl:variable name="AD-dates" as="item()+">
                <xsl:for-each select="$allDates[not(era = 'BC')]">
                    <xsl:value-of select="current()/child::year ! number()"/>
                </xsl:for-each>
            </xsl:variable>
            
      <xsl:variable name="allConvertedDates" select="(($BC-dates), ($AD-dates))"/>
            
        
         
            <xsl:variable name="latestDate" select="max($allConvertedDates)"/>
            
            <xsl:variable name="earliestDate" select="min($allConvertedDates)"/>
            
          <desc> HI! I'm the latest date: <xsl:value-of select="$latestDate"/></desc>
            
            <desc>And I'm the earliest data: <xsl:value-of select="$earliestDate"/>  </desc>-->


   <g transform="translate({abs($earliestDate) * $x-spacer + 10}, 0)">
       <rect width="{($latestDate - $earliestDate) * $x-spacer}" height="220" x="{$earliestDate * $x-spacer}" y="10" rx="20" ry="20" fill="blue"/>
       
       
            
         
         
         <!-- ebb: This outputs every single date when you're ready for it.-->
            <xsl:for-each select="$allConvertedDates">
                <g class="datePoint">
                    <circle r="20" cx="{current() * $x-spacer}" cy="90" fill="red" />
                    </g>
            </xsl:for-each>
            
   </g> 
        </svg>
    </xsl:template>
</xsl:stylesheet>